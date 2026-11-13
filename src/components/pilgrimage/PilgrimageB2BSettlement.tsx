import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { money } from './pilgrimage-documents';

type Cancellation = {
  id: string;
  status: 'requested' | 'rejected' | 'approved';
  own_request: boolean;
  reason: string;
  review_reason: string | null;
  credit_note: string | null;
  refund_id: string | null;
  refund_amount: number | null;
  refund_status: string | null;
};
type Settlement = {
  agreement_status: 'approved_internal' | 'voided';
  cancellation: Cancellation | null;
  supplier_orders: {
    id: string; reference: string; supplier: string; amount: number; paid: number;
    status: string; approval_status: string; due_date: string;
  }[];
};
const orderLabels: Record<string, string> = {
  pending: 'بانتظار الاعتماد', approved: 'معتمد', rejected: 'الصرف مرفوض',
  partially_paid: 'مسدد جزئيًا', paid: 'مسدد', cancelled: 'ملغى',
};
const messages: Record<string, string> = {
  pilgrimage_supplier_document_already_recorded: 'مستند المورد مسجل بالفعل ببيانات مختلفة.',
  invalid_pilgrimage_supplier_obligation: 'راجع اعتماد الاتفاق وعملة الشركة ونشاط المورد.',
  pilgrimage_b2b_cancellation_reviewer_required: 'يلزم مراجع مالي آخر بصلاحية الاسترداد.',
  pilgrimage_b2b_cancellation_in_progress: 'طلب الإلغاء قيد المراجعة.',
  pilgrimage_b2b_receipts_need_reconciliation: 'راجع حساب الذمم الذي رُحّلت عليه التحصيلات قبل إلغاء الفاتورة.',
  pilgrimage_b2b_refund_requires_financial_reversal: 'تعذر مطابقة الاسترداد مع القيد العكسي.',
};

export default function PilgrimageB2BSettlement({ orgId, saleId, currency }: {
  orgId: string; saleId: string; currency: string;
}) {
  const { getPermissionScope } = useSupabasePermissions();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canView = getPermissionScope('financial_view') === 'organization' &&
    getPermissionScope('invoices_view') === 'organization';
  const canEdit = getPermissionScope('financial_edit') === 'organization';
  const canReview = getPermissionScope('payments_refund') === 'organization';
  const canDisburse = canReview && getPermissionScope('payments_process') === 'organization';
  const [supplier, setSupplier] = useState('');
  const [document, setDocument] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reason, setReason] = useState('');
  const [decisionReason, setDecisionReason] = useState('');
  const [refundAccount, setRefundAccount] = useState('');
  const [refundReference, setRefundReference] = useState('');

  const settlementQ = useQuery({
    queryKey: ['pilgrimage-b2b-settlement', orgId, saleId],
    enabled: canView,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<Settlement>('get_pilgrimage_b2b_settlement',
        { _org: orgId, _sale_id: saleId });
      if (error) throw error;
      return data;
    },
  });
  const settlement = settlementQ.data;
  const cancellation = settlement?.cancellation;
  const approved = settlement?.agreement_status === 'approved_internal';
  const canAddSupplier = approved && canEdit && currency === 'EGP' && cancellation?.status !== 'requested';

  const supplierQ = useQuery({
    queryKey: ['pilgrimage-settlement-suppliers', orgId],
    enabled: canView && canAddSupplier,
    queryFn: async () => {
      const { data, error } = await supabase.from('suppliers').select('id,name')
        .eq('organization_id', orgId).eq('is_active', true).order('name');
      if (error) throw error;
      return data;
    },
  });
  const treasuryQ = useQuery({
    queryKey: ['pilgrimage-refund-accounts', orgId, currency],
    enabled: canView && canDisburse && cancellation?.refund_status === 'approved',
    queryFn: async () => {
      const { data, error } = await supabase.from('bank_accounts').select('id,account_name')
        .eq('organization_id', orgId).eq('currency', currency).eq('is_active', true)
        .in('treasury_kind', ['bank', 'cash']).order('account_name');
      if (error) throw error;
      return data;
    },
  });

  const action = useMutation({
    mutationFn: async ({ rpc, args }: { rpc: string; args: Record<string, unknown> }) => {
      const { error } = await callUntypedRpc(rpc, args);
      if (error) throw error;
    },
    onSuccess: (_, { rpc }) => {
      if (rpc === 'create_pilgrimage_supplier_obligation') {
        setDocument('');
        setAmount('');
      }
      // Cancellation changes the quote, agreement, inventory, invoice and ledger together.
      qc.invalidateQueries();
      toast({ title: 'تم تسجيل العملية المالية' });
    },
    onError: (error: { message: string }) => toast({
      title: 'تعذر تسجيل العملية',
      description: messages[error.message] || error.message,
      variant: 'destructive',
    }),
  });

  if (!canView) return null;
  if (settlementQ.isError) return <p className="text-sm text-destructive">تعذر تحميل مستحقات الموردين وتسوية الاتفاق.</p>;
  if (!settlement) return null;

  return (
    <section className="space-y-5 rounded-md border p-4" aria-label="مستحقات الموردين وإلغاء الاتفاق">
      <div className="space-y-3">
        <h3 className="font-semibold">مستحقات الموردين</h3>
        {settlement.supplier_orders.length > 0 && (
          <ul className="space-y-2 text-sm">
            {settlement.supplier_orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center gap-x-3">
                <strong>{order.supplier} · {order.reference}</strong>
                <span>{money(order.amount, currency)}</span>
                <span>متبقي {money(order.amount - order.paid, currency)}</span>
                <span>{orderLabels[order.approval_status === 'rejected' ? 'rejected' : order.status] || order.status}</span>
                <Link className="text-primary underline" to={`/payment-orders?ref=${encodeURIComponent(order.reference)}`}>
                  أمر الدفع
                </Link>
              </li>
            ))}
          </ul>
        )}
        {approved && canEdit && currency !== 'EGP' && <p className="text-sm text-muted-foreground">
          تسجيل مستحقات الموردين لهذا المسار متاح حاليًا بالجنيه المصري.
        </p>}
        {canAddSupplier && (
          <form className="grid gap-2 sm:grid-cols-2" onSubmit={(event) => {
            event.preventDefault();
            action.mutate({ rpc: 'create_pilgrimage_supplier_obligation', args: {
              _sale_id: saleId, _supplier_id: supplier, _reference: document,
              _amount: Number(amount), _due_date: dueDate,
            } });
          }}>
            <div>
              <Label htmlFor="pilgrimage-obligation-supplier">المورد</Label>
              <Select value={supplier} onValueChange={setSupplier} disabled={!supplierQ.data?.length}>
                <SelectTrigger id="pilgrimage-obligation-supplier">
                  <SelectValue placeholder={supplierQ.isError ? 'تعذر تحميل الموردين' :
                    supplierQ.isLoading ? 'جاري التحميل…' : 'اختر موردًا'} />
                </SelectTrigger>
                <SelectContent>
                  {supplierQ.data?.map((row) => <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pilgrimage-obligation-document">رقم مستند المورد</Label>
              <Input id="pilgrimage-obligation-document" required maxLength={120}
                value={document} onChange={(event) => setDocument(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="pilgrimage-obligation-amount">المبلغ المستحق ({currency})</Label>
              <Input id="pilgrimage-obligation-amount" type="number" required min="0.01" step="0.01"
                value={amount} onChange={(event) => setAmount(event.target.value)} />
            </div>
            <div>
              <Label htmlFor="pilgrimage-obligation-date">تاريخ الاستحقاق</Label>
              <Input id="pilgrimage-obligation-date" type="date" required
                value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </div>
            <Button type="submit" className="w-fit" disabled={!supplier || !document.trim() || action.isPending}>
              تسجيل استحقاق المورد
            </Button>
          </form>
        )}
      </div>

      <div className="space-y-3 border-t pt-3">
        <h3 className="font-semibold">إلغاء الاتفاق والاسترداد</h3>
        {cancellation && (
          <div className="space-y-1 text-sm">
            <p>{cancellation.status === 'requested' ? 'بانتظار المراجعة المالية' :
              cancellation.status === 'rejected' ? 'رُفض طلب الإلغاء' : 'اعتُمد الإلغاء وحُررت المقاعد'}</p>
            <p>{cancellation.reason}</p>
            {cancellation.review_reason && <p>قرار المراجع · {cancellation.review_reason}</p>}
            {cancellation.credit_note && <p>الإشعار الدائن · {cancellation.credit_note}</p>}
            {cancellation.refund_amount != null && <p>
              {cancellation.refund_status === 'paid' ? 'تم تسجيل صرف' : 'مستحق للاسترداد'}
              {' '}{money(cancellation.refund_amount, currency)}
            </p>}
          </div>
        )}
        {approved && canEdit && cancellation?.status !== 'requested' && (
          <form className="space-y-2" onSubmit={(event) => {
            event.preventDefault();
            action.mutate({ rpc: 'request_pilgrimage_b2b_cancellation', args: { _sale_id: saleId, _reason: reason } });
          }}>
            <Label htmlFor="pilgrimage-cancellation-reason">سبب الإلغاء</Label>
            <Input id="pilgrimage-cancellation-reason" required minLength={5} maxLength={1000}
              value={reason} onChange={(event) => setReason(event.target.value)} />
            <Button type="submit" variant="outline" disabled={reason.trim().length < 5 || action.isPending}>
              طلب إلغاء الاتفاق
            </Button>
          </form>
        )}
        {canReview && cancellation?.status === 'requested' && !cancellation.own_request && (
          <div className="space-y-2">
            <p className="text-sm">اعتماد الإلغاء يعكس فاتورة الشركة ويثبت المبلغ المحصّل كاسترداد مستحق. راجع مستندات الموردين بشكل مستقل.</p>
            <Label htmlFor="pilgrimage-cancellation-decision">ملاحظة المراجع</Label>
            <Input id="pilgrimage-cancellation-decision" maxLength={1000}
              value={decisionReason} onChange={(event) => setDecisionReason(event.target.value)} />
            <div className="flex flex-wrap gap-2">
              {[true, false].map((approve) => (
                <Button key={String(approve)} variant={approve ? 'destructive' : 'outline'}
                  disabled={action.isPending || (!approve && !decisionReason.trim())}
                  onClick={() => action.mutate({ rpc: 'review_pilgrimage_b2b_cancellation', args: {
                    _id: cancellation.id, _approve: approve, _reason: decisionReason,
                  } })}>
                  {approve ? 'اعتماد الإلغاء' : 'رفض الطلب'}
                </Button>
              ))}
            </div>
          </div>
        )}
        {canDisburse && cancellation?.refund_status === 'approved' && (
          <form className="space-y-2" onSubmit={(event) => {
            event.preventDefault();
            action.mutate({ rpc: 'pay_refund_request', args: {
              _refund_id: cancellation.refund_id, _treasury_account_id: refundAccount, _reference: refundReference,
            } });
          }}>
            <Label htmlFor="pilgrimage-refund-treasury">حساب صرف الاسترداد</Label>
            <Select value={refundAccount} onValueChange={setRefundAccount} disabled={!treasuryQ.data?.length}>
              <SelectTrigger id="pilgrimage-refund-treasury">
                <SelectValue placeholder={treasuryQ.isError ? 'تعذر تحميل الخزائن' : 'اختر الخزينة'} />
              </SelectTrigger>
              <SelectContent>
                {treasuryQ.data?.map((row) => <SelectItem key={row.id} value={row.id}>{row.account_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Label htmlFor="pilgrimage-refund-reference">مرجع الصرف المنفذ</Label>
            <Input id="pilgrimage-refund-reference" required maxLength={120}
              value={refundReference} onChange={(event) => setRefundReference(event.target.value)} />
            <Button type="submit" disabled={!refundAccount || !refundReference.trim() || action.isPending}>
              تسجيل صرف الاسترداد
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
