import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { allRows } from '@/lib/pagedRows';
import type { PartyWalletMovement } from '@/lib/partyWalletMovements';

const LEGACY_INVOICE_BATCH_SIZE = 100;

async function loadLegacyReceipts(orgId: string, partyId: string, signal: AbortSignal): Promise<PartyWalletMovement[]> {
  const invoices = await allRows((from, to) => supabase.from('invoices').select('id,invoice_number')
    .eq('organization_id', orgId).eq('customer_id', partyId).eq('is_demo', false)
    .gt('total_paid_amount', 0).order('id').range(from, to).abortSignal(signal));
  const invoiceNumbers = new Map(invoices.map(invoice => [invoice.id, invoice.invoice_number]));
  const receipts: PartyWalletMovement[] = [];

  for (let i = 0; i < invoices.length; i += LEGACY_INVOICE_BATCH_SIZE) {
    const invoiceIds = invoices.slice(i, i + LEGACY_INVOICE_BATCH_SIZE).map(invoice => invoice.id);
    // The posted residual excludes allocated payments and wallet settlements.
    const entries = await allRows((from, to) => supabase.from('journal_entries')
      .select('id,source_id,entry_date,total_debit,currency,entry_number')
      .eq('organization_id', orgId).eq('source_type', 'legacy_invoice_receipt').eq('status', 'posted')
      .in('source_id', invoiceIds).order('id').range(from, to).abortSignal(signal));
    for (const entry of entries) {
      receipts.push({
        id: `legacy:${entry.id}`,
        date: entry.entry_date,
        label: 'تحصيل تاريخي مجمّع',
        amount: Number(entry.total_debit),
        currency: entry.currency,
        balanceDelta: 0,
        cashDirection: 'in',
        document: invoiceNumbers.get(entry.source_id ?? ''),
        reference: entry.entry_number,
      });
    }
  }

  return receipts;
}

async function loadCustomerPayments(orgId: string, partyId: string, signal: AbortSignal): Promise<PartyWalletMovement[]> {
  const paymentFields = 'id,amount,currency,payment_date,created_at,reference_number,bank_accounts(account_name)';
  const [direct, viaBooking, viaInvoice, legacyReceipts] = await Promise.all([
    allRows((from, to) => supabase.from('customer_payments')
      .select(`${paymentFields},bookings(booking_number),invoices(invoice_number)`)
      .eq('organization_id', orgId).eq('customer_id', partyId).eq('status', 'completed')
      .eq('is_demo', false).order('id').range(from, to).abortSignal(signal)),
    allRows((from, to) => supabase.from('customer_payments')
      .select(`${paymentFields},bookings!inner(booking_number),invoices(invoice_number)`)
      .eq('organization_id', orgId).is('customer_id', null).eq('status', 'completed').eq('is_demo', false)
      .eq('bookings.organization_id', orgId).eq('bookings.customer_id', partyId)
      .order('id').range(from, to).abortSignal(signal)),
    allRows((from, to) => supabase.from('customer_payments')
      .select(`${paymentFields},bookings(booking_number),invoices!inner(invoice_number)`)
      .eq('organization_id', orgId).is('customer_id', null).is('booking_id', null)
      .eq('status', 'completed').eq('is_demo', false)
      .eq('invoices.organization_id', orgId).eq('invoices.customer_id', partyId)
      .order('id').range(from, to).abortSignal(signal)),
    loadLegacyReceipts(orgId, partyId, signal),
  ]);
  return [
    ...[...direct, ...viaBooking, ...viaInvoice].map((payment): PartyWalletMovement => ({
      id: `payment:${payment.id}`,
      date: payment.payment_date || payment.created_at,
      label: 'دفعة من العميل',
      amount: Number(payment.amount),
      currency: payment.currency,
      balanceDelta: 0,
      cashDirection: 'in',
      treasuryName: payment.bank_accounts?.account_name,
      document: payment.invoices?.invoice_number ?? payment.bookings?.booking_number,
      reference: payment.reference_number,
    })),
    ...legacyReceipts,
  ];
}

async function loadSupplierPayments(orgId: string, partyId: string, signal: AbortSignal): Promise<PartyWalletMovement[]> {
  const payments = await allRows((from, to) => supabase.from('supplier_payments')
    .select('id,amount,currency,paid_date,payment_date,created_at,reference_number,payment_reference,bank_accounts(account_name)')
    .eq('organization_id', orgId).eq('supplier_id', partyId).in('status', ['paid', 'completed'])
    .order('id').range(from, to).abortSignal(signal));
  return payments.map(payment => ({
    id: `payment:${payment.id}`,
    date: payment.paid_date || payment.payment_date || payment.created_at,
    label: 'دفعة للمورد',
    amount: Number(payment.amount),
    currency: payment.currency ?? 'EGP',
    balanceDelta: 0,
    cashDirection: 'out',
    treasuryName: payment.bank_accounts?.account_name,
    reference: payment.reference_number || payment.payment_reference,
  }));
}

export function usePartyWalletPayments(kind: 'customer' | 'supplier', partyId: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['party-wallet-payments', orgId, kind, partyId],
    enabled: !!orgId && !!partyId,
    queryFn: ({ signal }) => {
      if (!orgId || !partyId) return [];
      return kind === 'customer'
        ? loadCustomerPayments(orgId, partyId, signal)
        : loadSupplierPayments(orgId, partyId, signal);
    },
  });
}
