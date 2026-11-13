import type { Tables } from '@/integrations/supabase/types';

export type SupplierInvoice = Pick<Tables<'supplier_invoices'>,
  'id' | 'invoice_number' | 'invoice_date' | 'due_date' | 'amount' | 'amount_paid' |
  'status' | 'currency' | 'payment_order_id' | 'booking_id'>;

export function summarizeSupplierPayables(invoices: SupplierInvoice[], today: string) {
  const groups = new Map<string, {
    currency: string;
    outstanding: number;
    overdue: number;
    invoices: Array<SupplierInvoice & { remaining: number }>;
  }>();
  for (const invoice of invoices) {
    if (['cancelled', 'canceled', 'void', 'draft'].includes(invoice.status.toLowerCase())) continue;
    if (invoice.invoice_date > today) continue;
    // The posting workflow updates amount_paid for cash allocations and wallet offsets.
    const cents = Math.round((Number(invoice.amount) - Number(invoice.amount_paid)) * 100);
    if (cents <= 0) continue;
    const currency = invoice.currency.trim().toUpperCase();
    const group = groups.get(currency) ?? { currency, outstanding: 0, overdue: 0, invoices: [] };
    const dueDate = invoice.due_date && invoice.due_date >= '2000-01-01' && invoice.due_date <= '2100-12-31'
      ? invoice.due_date : invoice.invoice_date;
    const isOverdue = dueDate < today;
    group.outstanding += cents;
    if (isOverdue) group.overdue += cents;
    group.invoices.push({ ...invoice, remaining: cents / 100 });
    groups.set(currency, group);
  }
  return [...groups.values()].sort((a, b) => a.currency.localeCompare(b.currency)).map(group => ({
    ...group,
    outstanding: group.outstanding / 100,
    overdue: group.overdue / 100,
  }));
}
