import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOrgId } from '@/hooks/useOrgId';

const db = supabase as any;

export interface RefundBalanceMovement {
  id: string;
  amount: number;
  created_at: string;
  reference: string | null;
  treasury_account_id: string | null;
  invoice_id: string | null;
  supplier_order_id: string | null;
  invoice: { invoice_number: string } | null;
  order: { reference_number: string } | null;
  treasury: { account_name: string } | null;
}

export interface RefundBalance {
  id: string;
  kind: 'customer' | 'supplier';
  partyId: string | null;
  partyName: string | null;
  source: string | null;
  bookingId?: string | null;
  amount: number;
  currency: string;
  reference: string | null;
  status: string;
  movements: RefundBalanceMovement[];
}

export function remainingRefundBalance(row: RefundBalance) {
  if (row.status === 'paid' || row.status === 'settled' || row.status === 'rejected') return 0;
  const cents = Math.round(Number(row.amount) * 100);
  return (cents - row.movements.reduce((total, item) => total + Math.round(Number(item.amount) * 100), 0)) / 100;
}

const movements = 'refund_balance_settlements(id,amount,created_at,reference,treasury_account_id,invoice_id,supplier_order_id,invoice:invoices(invoice_number),order:supplier_payment_orders(reference_number),treasury:bank_accounts(account_name))';

export function useRefundBalances(kind: RefundBalance['kind'], partyId?: string) {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['refund-balances', orgId, kind, partyId],
    enabled: !!orgId,
    queryFn: async (): Promise<RefundBalance[]> => {
      if (kind === 'customer') {
        let query = db.from('refund_requests')
          .select(`*,customers(name),bookings(booking_number),${movements}`)
          .eq('organization_id', orgId).in('status', ['approved', 'paid']);
        if (partyId) query = query.eq('customer_id', partyId);
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) throw error;
        return (data ?? []).filter((row: any) => !row.pilgrimage_b2b_cancellation_id).map((row: any) => ({
          id: row.id, kind, partyId: row.customer_id, partyName: row.customers?.name,
          source: row.bookings?.booking_number, bookingId: row.booking_id, amount: row.amount, currency: row.currency,
          reference: row.reason, status: row.status, movements: row.refund_balance_settlements ?? [],
        }));
      }

      let query = db.from('supplier_refund_claims')
        .select(`id,amount,currency,reference,confirmed_at,rejected_at,supplier_id,suppliers(name),supplier_invoices(invoice_number),${movements}`)
        .eq('organization_id', orgId);
      if (partyId) query = query.eq('supplier_id', partyId);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => {
        const balance: RefundBalance = {
          id: row.id, kind, partyId: row.supplier_id, partyName: row.suppliers?.name,
          source: row.supplier_invoices?.invoice_number, amount: row.amount, currency: row.currency,
          reference: row.reference, status: row.rejected_at ? 'rejected' : row.confirmed_at ? 'confirmed' : 'pending',
          movements: row.refund_balance_settlements ?? [],
        };
        if (balance.status === 'confirmed' && remainingRefundBalance(balance) === 0) balance.status = 'settled';
        return balance;
      });
    },
  });
}

type Settlement = {
  id: string;
  amount: number;
  reference: string | null;
  kind: RefundBalance['kind'];
  sourceId: string;
  destination: 'treasury' | 'document';
  targetId: string;
};

type Claim = {
  id: string;
  action: 'create' | 'confirm' | 'reject';
  invoiceId?: string;
  amount?: number;
  reference?: string;
};

export function useRefundBalanceActions() {
  const orgId = useOrgId();
  const client = useQueryClient();
  const refresh = () => {
    void client.invalidateQueries();
    toast({ title: 'تم تسجيل الحركة' });
  };
  const failure = (error: { message?: string }) => {
    toast({ title: 'تعذر تسجيل الحركة', description: error.message, variant: 'destructive' });
  };
  const settle = useMutation({
    mutationFn: async (values: Settlement) => {
      if (!orgId) throw new Error('اختر المؤسسة أولًا');
      const { data, error } = await db.rpc('settle_refund_balance', {
        _org: orgId, _id: values.id, _amount: values.amount, _reference: values.reference,
        _refund: values.kind === 'customer' ? values.sourceId : null,
        _claim: values.kind === 'supplier' ? values.sourceId : null,
        _treasury: values.destination === 'treasury' ? values.targetId : null,
        _invoice: values.kind === 'customer' && values.destination === 'document' ? values.targetId : null,
        _order: values.kind === 'supplier' && values.destination === 'document' ? values.targetId : null,
      });
      if (error) throw error;
      if (data !== values.id) throw new Error('لم يتم تأكيد التسوية');
    },
    onSuccess: refresh,
    onError: failure,
  });
  const claim = useMutation({
    mutationFn: async (values: Claim) => {
      if (!orgId) throw new Error('اختر المؤسسة أولًا');
      const { data, error } = await db.rpc('manage_supplier_refund_claim', {
        _org: orgId, _id: values.id, _action: values.action, _invoice: values.invoiceId,
        _amount: values.amount, _reference: values.reference,
      });
      if (error) throw error;
      if (data !== values.id) throw new Error('لم يتم تأكيد المطالبة');
    },
    onSuccess: refresh,
    onError: failure,
  });
  return { settle, claim };
}
