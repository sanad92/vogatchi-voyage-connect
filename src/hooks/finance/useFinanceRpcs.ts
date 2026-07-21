import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from '@/hooks/use-toast';

const sb = supabase as any;

export interface LedgerRow {
  entry_date: string;
  entry_type: string;
  reference: string;
  booking_id: string | null;
  debit: number;
  credit: number;
  currency: string;
  balance: number;
}

export const useCustomerLedgerRpc = (customerId?: string | null, from?: string, to?: string) =>
  useQuery({
    queryKey: ['customer-ledger-rpc', customerId, from, to],
    enabled: !!customerId,
    queryFn: async (): Promise<LedgerRow[]> => {
      const { data, error } = await sb.rpc('get_customer_ledger', {
        _customer_id: customerId, _from: from || null, _to: to || null,
      });
      if (error) throw error;
      return (data || []) as LedgerRow[];
    },
  });

export const useSupplierLedgerRpc = (supplierId?: string | null, from?: string, to?: string) =>
  useQuery({
    queryKey: ['supplier-ledger-rpc', supplierId, from, to],
    enabled: !!supplierId,
    queryFn: async (): Promise<LedgerRow[]> => {
      const { data, error } = await sb.rpc('get_supplier_ledger', {
        _supplier_id: supplierId, _from: from || null, _to: to || null,
      });
      if (error) throw error;
      return (data || []) as LedgerRow[];
    },
  });

export const useCashFlow = (from?: string, to?: string) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['cash-flow', orgId, from, to],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb.rpc('get_cash_flow', {
        _org: orgId, _from: from || null, _to: to || null,
      });
      if (error) throw error;
      return (data || []) as Array<{ day: string; incoming: number; outgoing: number; net: number }>;
    },
  });
};

export const useFinanceExecutive = (from?: string, to?: string) => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['finance-executive', orgId, from, to],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb.rpc('get_finance_executive', {
        _org: orgId, _from: from || null, _to: to || null,
      });
      if (error) throw error;
      return data as any;
    },
  });
};

export const useTreasuryAccounts = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['treasury-accounts', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb.from('bank_accounts')
        .select('*').eq('organization_id', orgId).eq('is_active', true).order('treasury_kind');
      if (error) throw error;
      return data as any[];
    },
  });
};

export const useRefundRequests = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['refund-requests', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb.from('refund_requests')
        .select('*, bookings(booking_number, destination), customers(name)')
        .eq('organization_id', orgId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
};

export const usePendingSupplierPOs = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['pending-supplier-pos', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await sb.from('supplier_payment_orders')
        .select('*, suppliers(name), bookings(booking_number)')
        .eq('organization_id', orgId).eq('approval_status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
};

export const useRecordCustomerPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      invoice_id?: string | null; amount: number; currency?: string; exchange_rate?: number;
      method?: string; treasury_account_id?: string | null; payment_date?: string;
      reference?: string | null; notes?: string | null; client_ref?: string | null;
      booking_id?: string | null; customer_id?: string | null;
    }) => {
      const { data, error } = await sb.rpc('record_customer_payment', {
        _invoice_id: args.invoice_id ?? null,
        _amount: args.amount,
        _currency: args.currency ?? 'EGP',
        _exchange_rate: args.exchange_rate ?? 1,
        _method: args.method ?? 'cash',
        _treasury_account_id: args.treasury_account_id ?? null,
        _payment_date: args.payment_date ?? new Date().toISOString().slice(0, 10),
        _reference: args.reference ?? null,
        _notes: args.notes ?? null,
        _client_ref: args.client_ref ?? null,
        _booking_id: args.booking_id ?? null,
        _customer_id: args.customer_id ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast({ title: 'تم تسجيل الدفعة' });
    },
    onError: (e: any) => toast({ title: 'فشل تسجيل الدفعة', description: e.message, variant: 'destructive' }),
  });
};

export const useApproveSupplierPO = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { po_id: string; approve: boolean; reason?: string }) => {
      const { error } = await sb.rpc('approve_supplier_payment_order', {
        _po_id: args.po_id, _approve: args.approve, _reason: args.reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_, v) => {
      qc.invalidateQueries();
      toast({ title: v.approve ? 'تم اعتماد أمر الدفع' : 'تم رفض أمر الدفع' });
    },
    onError: (e: any) => toast({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });
};

export const useRecordSupplierPayment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      po_id: string; amount: number; currency?: string; exchange_rate?: number;
      method?: string; treasury_account_id?: string | null; payment_date?: string;
      reference?: string | null; notes?: string | null;
    }) => {
      const { data, error } = await sb.rpc('record_supplier_payment', {
        _po_id: args.po_id, _amount: args.amount,
        _currency: args.currency ?? 'EGP', _exchange_rate: args.exchange_rate ?? 1,
        _method: args.method ?? 'bank_transfer',
        _treasury_account_id: args.treasury_account_id ?? null,
        _payment_date: args.payment_date ?? new Date().toISOString().slice(0, 10),
        _reference: args.reference ?? null, _notes: args.notes ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { qc.invalidateQueries(); toast({ title: 'تم تسجيل دفعة المورد' }); },
    onError: (e: any) => toast({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });
};

export const useRefundActions = () => {
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: async (args: { booking_id: string; amount: number; currency?: string;
      exchange_rate?: number; source_payment_id?: string | null; reason?: string; }) => {
      const { data, error } = await sb.rpc('create_refund_request', {
        _booking_id: args.booking_id, _amount: args.amount,
        _currency: args.currency ?? 'EGP', _exchange_rate: args.exchange_rate ?? 1,
        _source_payment_id: args.source_payment_id ?? null, _reason: args.reason ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => { qc.invalidateQueries(); toast({ title: 'تم إنشاء طلب الاسترداد' }); },
    onError: (e: any) => toast({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });
  const approve = useMutation({
    mutationFn: async (args: { refund_id: string; approve: boolean; reason?: string }) => {
      const { error } = await sb.rpc('approve_refund_request', {
        _refund_id: args.refund_id, _approve: args.approve, _reason: args.reason ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast({ title: 'تم تحديث حالة الاسترداد' }); },
    onError: (e: any) => toast({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });
  const pay = useMutation({
    mutationFn: async (args: { refund_id: string; treasury_account_id: string; reference?: string }) => {
      const { error } = await sb.rpc('pay_refund_request', {
        _refund_id: args.refund_id, _treasury_account_id: args.treasury_account_id,
        _reference: args.reference ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries(); toast({ title: 'تم صرف الاسترداد' }); },
    onError: (e: any) => toast({ title: 'فشل', description: e.message, variant: 'destructive' }),
  });
  return { create, approve, pay };
};
