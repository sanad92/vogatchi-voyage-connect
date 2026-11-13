import { readFileSync, writeFileSync } from 'node:fs';

const launch = 'supabase/migrations/20260822140000_financial_launch_hardening.sql';
const doubleEntry = 'supabase/migrations/20260904143000_double_entry_core_hardening.sql';
const banking = 'supabase/migrations/20260226014315_aeb40c1c-c21e-4486-ba89-f43cc81bb517.sql';

function definitions(path, functions) {
  const source = readFileSync(path, 'utf8');
  return functions.map(name => {
    const start = source.indexOf(`CREATE OR REPLACE FUNCTION public.${name}(`);
    const end = source.indexOf('$$;', start);
    if (start < 0 || end < 0) throw new Error(`Missing fixture definition ${name} in ${path}`);
    return source.slice(start, end + 3);
  });
}

const sql = [
  ...definitions(launch, [
    'normalize_invoice_totals', 'post_invoice', 'post_invoice_legacy_receipt',
    '_trg_post_invoice', '_trg_post_invoice_legacy_receipt', 'post_customer_payment',
  ]),
  ...definitions(doubleEntry, [
    'guard_customer_payment_allocation', 'refresh_customer_invoice_payment_state',
    'sync_customer_payment_allocation', 'sync_customer_invoices_from_payment',
    'post_supplier_invoice', '_trg_post_supplier_invoice',
  ]),
  ...definitions(banking, ['update_bank_balance_on_transaction']),
  `
CREATE TRIGGER trg_normalize_invoice_totals BEFORE INSERT OR UPDATE OF subtotal, discount_amount, vat_rate,
  vat_amount, final_amount, total_paid_amount ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.normalize_invoice_totals();
CREATE TRIGGER trg_post_invoice AFTER INSERT OR UPDATE OF subtotal, discount_amount, vat_rate,
  vat_amount, final_amount, status, issued_date, currency, booking_type, is_demo ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public._trg_post_invoice();
CREATE TRIGGER trg_post_invoice_legacy_receipt AFTER INSERT OR UPDATE OF total_paid_amount, status,
  issued_date, currency, is_demo ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public._trg_post_invoice_legacy_receipt();
CREATE TRIGGER trg_guard_customer_payment_allocation BEFORE INSERT OR UPDATE OR DELETE
ON public.customer_payment_allocations FOR EACH ROW EXECUTE FUNCTION public.guard_customer_payment_allocation();
CREATE TRIGGER trg_sync_customer_payment_allocation AFTER INSERT OR UPDATE OR DELETE
ON public.customer_payment_allocations FOR EACH ROW EXECUTE FUNCTION public.sync_customer_payment_allocation();
CREATE TRIGGER trg_sync_customer_invoices_from_payment AFTER UPDATE OF status OR DELETE
ON public.customer_payments FOR EACH ROW EXECUTE FUNCTION public.sync_customer_invoices_from_payment();
CREATE TRIGGER trg_post_supplier_invoice AFTER INSERT OR UPDATE OF amount, currency, exchange_rate,
  invoice_date, status, booking_id, supplier_id ON public.supplier_invoices
FOR EACH ROW EXECUTE FUNCTION public._trg_post_supplier_invoice();
CREATE TRIGGER trg_bank_balance_update AFTER INSERT OR UPDATE OR DELETE ON public.bank_account_transactions
FOR EACH ROW EXECUTE FUNCTION public.update_bank_balance_on_transaction();
CREATE FUNCTION public._trg_post_customer_payment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM public.post_customer_payment(NEW.id); RETURN NEW; END;
$$;
CREATE TRIGGER trg_customer_payment_to_journal AFTER INSERT OR UPDATE OF status ON public.customer_payments
FOR EACH ROW EXECUTE FUNCTION public._trg_post_customer_payment();
`,
];
writeFileSync('/tmp/safar-refund-existing-finance.sql', sql.join('\n\n'));
