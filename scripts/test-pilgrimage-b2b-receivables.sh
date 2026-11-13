#!/usr/bin/env bash
set -euo pipefail

# Install the exact core finance definitions used by this integration in the
# fixture, without applying unrelated historical repairs or data backfills.
python3 - "${1:-}" <<'PY' | psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1
from pathlib import Path
import re
import sys

migrations = Path('supabase/migrations')
launch, integrity, payment, periods, treasury = (
    next(migrations.glob(pattern)).read_text()
    for pattern in (
        '20260822140000_*', '20260904143000_*',
        '20260907160253_*', '20260424150123_*', '20260226014315_*',
    )
)
functions = [
    (launch, 'normalize_invoice_totals'),
    (launch, 'post_invoice'),
    (launch, 'post_customer_payment'),
    (launch, 'post_invoice_legacy_receipt'),
    (launch, '_trg_post_invoice'),
    (launch, '_trg_post_invoice_legacy_receipt'),
    (launch, '_trg_post_customer_payment'),
    (integrity, 'guard_customer_payment_allocation'),
    (integrity, 'refresh_customer_invoice_payment_state'),
    (integrity, 'sync_customer_payment_allocation'),
    (integrity, 'sync_customer_invoices_from_payment'),
    (integrity, 'guard_locked_journal_entry'),
    (integrity, 'assert_journal_entry_balanced'),
    (periods, 'trg_block_closed_period'),
    (payment, 'record_customer_payment'),
    (treasury, 'update_bank_balance_on_transaction'),
]
triggers = [
    (launch, 'trg_normalize_invoice_totals'),
    (launch, 'trg_post_invoice'),
    (launch, 'trg_post_invoice_legacy_receipt'),
    (launch, 'trg_customer_payment_to_journal'),
    (integrity, 'trg_guard_customer_payment_allocation'),
    (integrity, 'trg_sync_customer_payment_allocation'),
    (integrity, 'trg_sync_customer_invoices_from_payment'),
    (integrity, 'trg_guard_locked_journal_entry'),
    (integrity, 'trg_assert_journal_header_balanced'),
    (integrity, 'trg_assert_journal_lines_balanced'),
    (periods, 'trg_je_block_closed'),
    (treasury, 'trg_bank_balance_update'),
]

definitions = [
    re.search(rf'CREATE OR REPLACE FUNCTION public\.{name}\(.*?AS\s+(\$\w*\$).*?\1;', src, re.S | re.I)[0]
    for src, name in functions
]
definitions.extend(
    re.search(rf'CREATE (?:CONSTRAINT )?TRIGGER {name}\b[^;]+;', src)[0]
    for src, name in triggers
)
fixture = Path('scripts/test-pilgrimage-b2b-receivables.sql').read_text()
print(fixture.replace('-- CORE_FINANCE_FUNCTIONS', '\n'.join(definitions)))
if sys.argv[1] == 'settlement':
    payables, approvals, refunds, reports = (
        next(migrations.glob(pattern)).read_text()
        for pattern in ('20260904100616_*', '20260907105813_*', '20260822144000_*', '20260822141000_*')
    )
    settlement_functions = [
        (payables, 'sync_supplier_invoice_from_payment_order'),
        (payables, 'prepare_supplier_payment_allocation'),
        (payables, 'refresh_supplier_invoice_payment_state'),
        (payables, 'refresh_supplier_invoice_from_allocation'),
        (payables, 'refresh_supplier_invoices_from_payment'),
        (integrity, 'post_supplier_invoice'),
        (integrity, '_trg_post_supplier_invoice'),
        (integrity, 'post_supplier_payment'),
        (integrity, 'guard_supplier_payment_total_allocation'),
        (integrity, 'sync_supplier_payment_allocation_journal'),
        (integrity, 'guard_locked_financial_source'),
        (launch, '_trg_post_supplier_payment'),
        (approvals, 'approve_supplier_payment_order'),
        (payment, 'record_supplier_payment'),
        (payment, 'pay_refund_request'),
        (refunds, 'post_customer_refund'),
        (refunds, '_trg_post_customer_refund'),
        (reports, 'get_customer_ledger'),
    ]
    settlement_triggers = [
        (payables, 'trg_sync_supplier_invoice_from_payment_order'),
        (payables, 'trg_prepare_supplier_payment_allocation'),
        (payables, 'trg_refresh_supplier_invoice_from_allocation'),
        (payables, 'trg_refresh_supplier_invoices_from_payment'),
        (integrity, 'trg_post_supplier_invoice'),
        (integrity, 'trg_guard_supplier_payment_total_allocation'),
        (integrity, 'trg_sync_supplier_payment_allocation_journal'),
        (integrity, 'trg_guard_locked_invoice_cancellation'),
        (launch, 'trg_post_supplier_payment'),
        (refunds, 'trg_post_customer_refund'),
    ]
    statements = [
        re.search(rf'CREATE OR REPLACE FUNCTION public\.{name}\(.*?AS\s+(\$\w*\$).*?\1;', src, re.S | re.I)[0]
        for src, name in settlement_functions
    ]
    statements.extend(
        re.search(rf'CREATE TRIGGER {name}\b[^;]+;', src)[0] for src, name in settlement_triggers
    )
    fixture = Path('scripts/test-pilgrimage-b2b-settlement.sql').read_text()
    print(fixture.replace('-- CORE_SETTLEMENT_FUNCTIONS', '\n'.join(statements)))
PY

if [[ "${1:-}" == settlement ]]; then exit 0; fi

actor=00000000-0000-4000-8000-000000000011
bank=00000000-0000-4000-8000-000000000601
first_session=$(mktemp)
second_session=$(mktemp)
trap 'rm -f "$first_session" "$second_session"' EXIT

settle() {
  psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 <<SQL
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL test.user_id = '$actor';
SELECT public.record_pilgrimage_b2b_collection(id, 100, 'bank_transfer', '$bank', current_date, '$1')
FROM public.invoices WHERE pilgrimage_b2b_agreement_id IS NOT NULL;
COMMIT;
SQL
}

settle 'Final A' >"$first_session" 2>&1 &
first_pid=$!
settle 'Final B' >"$second_session" 2>&1 &
second_pid=$!
first_ok=0
second_ok=0
wait "$first_pid" && first_ok=1
wait "$second_pid" && second_ok=1
if ((first_ok + second_ok != 1)); then
  cat "$first_session" "$second_session"
  exit 1
fi
if ! grep -Fq 'pilgrimage_b2b_collection_exceeds_balance' "$first_session" "$second_session"; then
  cat "$first_session" "$second_session"
  exit 1
fi

psql -h localhost -U postgres -d postgres -v ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE bill uuid;
BEGIN
  SELECT id INTO STRICT bill FROM public.invoices
  WHERE pilgrimage_b2b_agreement_id IS NOT NULL AND remaining_amount = 0
    AND total_paid_amount = 5000 AND status = 'paid' AND payment_status = 'paid';

  IF (SELECT count(*) FROM public.customer_payments WHERE invoice_id = bill AND status = 'completed') <> 3
    OR (SELECT sum(amount) FROM public.customer_payment_allocations WHERE invoice_id = bill) <> 5000
    OR (SELECT sum(amount) FROM public.bank_account_transactions WHERE related_invoice_id = bill) <> 5000
    OR (SELECT current_balance FROM public.bank_accounts
        WHERE id = '00000000-0000-4000-8000-000000000601') <> 2400
    OR (SELECT current_balance FROM public.bank_accounts
        WHERE id = '00000000-0000-4000-8000-000000000602') <> 2600
    OR (SELECT count(*) FROM public.journal_entries WHERE source_type = 'customer_payment') <> 3
    OR EXISTS (SELECT 1 FROM public.journal_entries WHERE source_type = 'legacy_invoice_receipt')
    OR NOT EXISTS (SELECT 1 FROM public.journal_entries WHERE source_type = 'invoice' AND source_id = bill
       AND is_locked AND total_debit = 5000 AND total_credit = 5000)
    OR NOT EXISTS (SELECT 1 FROM public.finance_transactions WHERE amount = 2600
       AND direction = 'debit' AND account_code = '1000') THEN
    RAISE EXCEPTION 'B2B accounting posted duplicates, bypassed allocation, or used the wrong cash route';
  END IF;
END $$;
SELECT 'B2B invoice, treasury, balanced journals and final-collection race passed' AS result;
SQL
