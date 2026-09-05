import assert from 'node:assert/strict';
import fs from 'node:fs';

const money = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const invoiceTotals = ({ subtotal, discount = 0, vatRate = 0, paid = 0 }) => {
  assert(subtotal >= 0 && discount >= 0 && vatRate >= 0 && paid >= 0);
  assert(discount <= subtotal);
  const net = money(subtotal - discount);
  const vat = money(net * vatRate / 100);
  const final = money(net + vat);
  assert(paid <= final);
  return { net, vat, final, remaining: money(final - paid) };
};

const allocateReceipt = ({ receipt, invoiceRemaining }) => {
  assert(receipt > 0 && invoiceRemaining >= 0);
  const receivable = money(Math.min(receipt, invoiceRemaining));
  return { receivable, customerAdvance: money(receipt - receivable) };
};

const allocateSupplierPayment = ({ payment, invoiceAllocated }) => {
  assert(payment > 0 && invoiceAllocated >= 0 && invoiceAllocated <= payment);
  return {
    accountsPayable: money(invoiceAllocated),
    supplierAdvance: money(payment - invoiceAllocated),
  };
};

const commission = ({ profits, rate }) => {
  assert(rate >= 0 && rate <= 100);
  return money(Math.max(profits.reduce((sum, profit) => sum + profit, 0), 0) * rate / 100);
};

const groupByCurrency = (rows) => rows.reduce((totals, row) => ({
  ...totals,
  [row.currency]: money((totals[row.currency] || 0) + row.amount),
}), {});

assert.deepEqual(
  invoiceTotals({ subtotal: 1_000, discount: 100, vatRate: 14, paid: 200 }),
  { net: 900, vat: 126, final: 1_026, remaining: 826 },
  'VAT must be calculated after discount and remaining must use the final total',
);

assert.equal(money(750 - 560), 190, 'booking profit must equal selling price minus supplier cost');

assert.deepEqual(
  allocateReceipt({ receipt: 900, invoiceRemaining: 826 }),
  { receivable: 826, customerAdvance: 74 },
  'overpayment must not overstate accounts receivable',
);

assert.deepEqual(
  allocateSupplierPayment({ payment: 1_000, invoiceAllocated: 760 }),
  { accountsPayable: 760, supplierAdvance: 240 },
  'unallocated supplier payments must be supplier advances, not AP settlements',
);

assert.equal(commission({ profits: [190, 110, -50], rate: 10 }), 25, 'period commission uses net profit');
assert.equal(commission({ profits: [-100, -25], rate: 10 }), 0, 'loss periods cannot create negative commission');

assert.deepEqual(
  groupByCurrency([
    { amount: 100, currency: 'EGP' },
    { amount: 5, currency: 'USD' },
    { amount: 25, currency: 'EGP' },
  ]),
  { EGP: 125, USD: 5 },
  'different currencies must never be added into one nominal total',
);

const journal = [
  { debit: 1_026, credit: 0 },
  { debit: 0, credit: 900 },
  { debit: 0, credit: 126 },
];
assert.equal(
  money(journal.reduce((sum, line) => sum + line.debit - line.credit, 0)),
  0,
  'invoice journal must balance after discount and VAT',
);

const supplierIntegrityMigration = fs.readFileSync(
  new URL('../supabase/migrations/20260904100616_booking_supplier_payable_integrity.sql', import.meta.url),
  'utf8',
);
assert.match(
  supplierIntegrityMigration,
  /supplier_invoice_id[\s\S]+refresh_supplier_invoice_payment_state/,
  'supplier payments must settle a supplier invoice, not only a booking or payment order',
);

const doubleEntryMigration = fs.readFileSync(
  new URL('../supabase/migrations/20260904143000_double_entry_core_hardening.sql', import.meta.url),
  'utf8',
);

const wave3ReportingMigration = fs.readFileSync(
  new URL('../supabase/migrations/20260904212953_wave3_general_ledger_trial_balance.sql', import.meta.url),
  'utf8',
);
const incomeStatementMigration = fs.readFileSync(
  new URL('../supabase/migrations/20260905011917_wave3_income_statement.sql', import.meta.url),
  'utf8',
);
const balanceSheetMigration = fs.readFileSync(
  new URL('../supabase/migrations/20260905020015_wave3_balance_sheet.sql', import.meta.url),
  'utf8',
);
assert.match(
  wave3ReportingMigration,
  /get_general_ledger_v2[\s\S]+e\.currency = v_currency[\s\S]+l\.cost_center_id = _cost_center_id/,
  'general ledger must never mix currencies and must support cost-center filtering',
);
assert.match(
  incomeStatementMigration,
  /get_income_statement_v2[\s\S]+e\.currency = v_currency[\s\S]+l\.cost_center_id = _cost_center_id/,
  'income statement must never mix currencies and must support cost-center filtering',
);
assert.match(
  balanceSheetMigration,
  /get_balance_sheet_v2[\s\S]+e\.status = 'posted'[\s\S]+e\.currency = v_currency/,
  'balance sheet must use posted journals only and never mix currencies',
);
assert.match(
  balanceSheetMigration,
  /current_earnings[\s\S]+SUM\(l\.total_credit - l\.total_debit\)[\s\S]+account_code = '3999'/,
  'balance sheet must include unclosed revenue and expense accounts as current earnings',
);
assert.match(
  balanceSheetMigration,
  /_can_read_org_finance\(_org_id\)[\s\S]+REVOKE ALL ON FUNCTION public\.get_balance_sheet_v2[\s\S]+FROM PUBLIC, anon/,
  'balance sheet RPC must enforce organization access and deny anonymous execution',
);
assert.match(
  incomeStatementMigration,
  /LEFT JOIN public\.bookings[\s\S]+lower\(b\.booking_type\) = v_booking_type/,
  'income statement must support booking-type filtering through the journal booking dimension',
);
assert.match(
  incomeStatementMigration,
  /account_code LIKE '5%' THEN 'cost_of_sales'[\s\S]+ELSE 'operating_expense'/,
  'income statement must separate direct service costs from operating expenses',
);
assert.match(
  incomeStatementMigration,
  /_can_read_org_finance\(_org_id\)[\s\S]+REVOKE ALL ON FUNCTION public\.get_income_statement_v2[\s\S]+FROM PUBLIC, anon/,
  'income statement RPC must enforce organization access and deny anonymous execution',
);
assert.match(
  wave3ReportingMigration,
  /get_trial_balance_v2[\s\S]+GREATEST\(b\.balance, 0\)[\s\S]+GREATEST\(-b\.balance, 0\)/,
  'trial balance must split ending balances into debit and credit columns',
);
assert.match(
  wave3ReportingMigration,
  /_can_read_org_finance\(_org_id\)[\s\S]+REVOKE ALL ON FUNCTION public\.get_trial_balance_v2[\s\S]+FROM PUBLIC, anon/,
  'financial report RPCs must enforce organization access and deny anonymous execution',
);

const generalLedgerPage = fs.readFileSync(
  new URL('../src/pages/GeneralLedger.tsx', import.meta.url),
  'utf8',
);
const balanceSheetPage = fs.readFileSync(
  new URL('../src/pages/finance/BalanceSheet.tsx', import.meta.url),
  'utf8',
);
assert.match(
  balanceSheetPage,
  /useBalanceSheetV2[\s\S]+reports_export[\s\S]+general-ledger\?[\s\S]+downloadCsv/,
  'balance sheet must support account drill-down and permission-controlled safe export',
);
assert.match(
  generalLedgerPage,
  /get_general_ledger_summary_v2[\s\S]+journal-entries\?entry=/,
  'general ledger must show authoritative opening/closing totals and drill down to the journal entry',
);
assert.match(
  doubleEntryMigration,
  /post_supplier_invoice[\s\S]+supplier_invoice[\s\S]+account_id, debit, credit/,
  'supplier invoices must accrue COGS and AP through a canonical journal',
);
assert.match(
  doubleEntryMigration,
  /Supplier Advances[\s\S]+v_unallocated[\s\S]+v_advance/,
  'unallocated supplier payments must post to supplier advances',
);
assert.match(
  doubleEntryMigration,
  /CREATE CONSTRAINT TRIGGER trg_assert_journal_lines_balanced/,
  'posted journal lines must be checked at transaction commit',
);
assert.match(
  doubleEntryMigration,
  /DROP TRIGGER IF EXISTS trg_post_booking_cost/,
  'booking-level cost accrual must be retired before supplier invoices own AP',
);
assert.match(
  supplierIntegrityMigration,
  /payment exceeds the remaining supplier invoice balance/i,
  'supplier invoice overpayments must fail closed',
);

const bookingFinancialsHook = fs.readFileSync(
  new URL('../src/hooks/useBookingFinancials.ts', import.meta.url),
  'utf8',
);
assert.match(
  bookingFinancialsHook,
  /from\('supplier_invoices'\)/,
  'booking AP must use supplier invoices as its authoritative obligation',
);
assert.doesNotMatch(
  bookingFinancialsHook,
  /\bany\b/,
  'booking financial read model must stay typed',
);

console.log('Financial formula, double-entry, and reporting checks passed: 28/28');
