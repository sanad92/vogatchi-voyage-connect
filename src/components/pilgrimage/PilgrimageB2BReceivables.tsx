import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { money } from './pilgrimage-documents';

type Props = {
  orgId: string;
  saleId?: string;
  currency: string;
  invoiceId?: string;
};
type Installment = { sequence_no: number; due_date: string; amount: number };
type Receipt = { id: string; date: string; amount: number; reference: string; method: string };

const errors: Record<string, string> = {
  pilgrimage_b2b_cancellation_in_progress: 'التحصيل متوقف أثناء مراجعة الإلغاء.',
  pilgrimage_b2b_invoice_not_authorized: 'صلاحياتك الحالية لا تسمح بإصدار فاتورة الاتفاق.',
  pilgrimage_b2b_collection_not_authorized: 'صلاحياتك الحالية لا تسمح بتسجيل تحصيل على الفاتورة.',
  pilgrimage_b2b_invoice_tax_already_set: 'صدرت الفاتورة بالفعل بنسبة ضريبة مختلفة.',
  approved_pilgrimage_b2b_agreement_required: 'اعتمد الاتفاق قبل إصدار الفاتورة.',
  active_pilgrimage_b2b_debtor_required: 'ملف الشركة المدينة في CRM غير نشط.',
  pilgrimage_b2b_vat_rate_required: 'أدخل نسبة الضريبة المعتمدة بدقة منزلتين عشريتين كحد أقصى.',
  pilgrimage_b2b_requires_company_currency: 'عملة الاتفاق يجب أن تطابق عملة الشركة المضبوطة في الإعدادات.',
  pilgrimage_b2b_collection_exceeds_balance: 'المبلغ يتجاوز الرصيد المتبقي.',
  pilgrimage_b2b_receipt_reference_already_used: 'مرجع التحصيل مسجل بالفعل ببيانات مختلفة.',
  invalid_pilgrimage_b2b_collection: 'راجع المبلغ والتاريخ والمرجع وحساب الخزينة.',
};

export default function PilgrimageB2BReceivables({ orgId, saleId, currency, invoiceId }: Props) {
  const { getPermissionScope } = useSupabasePermissions();
  const { toast } = useToast();
  const qc = useQueryClient();
  const canView = getPermissionScope('invoices_view') === 'organization' &&
    getPermissionScope('financial_view') === 'organization';
  const canIssue = getPermissionScope('invoices_create') === 'organization' &&
    getPermissionScope('invoices_send') === 'organization';
  const canCollect = getPermissionScope('payments_process') === 'organization';
  const [vatRate, setVatRate] = useState('');
  const [method, setMethod] = useState<'cash' | 'bank_transfer'>('bank_transfer');
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const today = new Date().toLocaleDateString('sv-SE');
  const [paymentDate, setPaymentDate] = useState(today);

  const summaryKey = ['pilgrimage-b2b-receivables', orgId, saleId ?? invoiceId];
  const summaryQ = useQuery({
    queryKey: summaryKey,
    enabled: canView && Boolean(orgId && (saleId || invoiceId)),
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<{
        agreement_id: string;
        customer_id: string;
        sale_id?: string;
        cancelled?: boolean;
        cancellation_pending?: boolean;
        total: number;
        installments: Installment[];
        receipts: Receipt[];
        invoice: { id: string; number: string; paid: number; remaining: number; issued_date: string } | null;
      }>('get_pilgrimage_b2b_receivables', { _organization_id: orgId, _sale_id: saleId ?? null, _invoice_id: invoiceId ?? null });
      if (error) throw error;
      return data;
    },
  });
  const summary = summaryQ.data;
  const invoice = summary?.invoice;
  const pendingCancellation = Boolean(summary?.cancellation_pending);
  const cancelled = Boolean(summary?.cancelled);

  const accountsQ = useQuery({
    queryKey: ['pilgrimage-b2b-treasury', orgId, currency, method],
    enabled: canCollect && !pendingCancellation && !cancelled && Boolean(invoice && invoice.remaining > 0),
    queryFn: async () => {
      const { data, error } = await supabase.from('bank_accounts')
        .select('id,account_name')
        .eq('organization_id', orgId).eq('is_active', true).eq('currency', currency)
        .eq('treasury_kind', method === 'cash' ? 'cash' : 'bank').order('account_name');
      if (error) throw error;
      return data;
    },
  });

  const onError = (error: { message: string }) => toast({
    title: 'تعذر إتمام العملية المالية',
    description: errors[error.message] || error.message,
    variant: 'destructive',
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['pilgrimage-b2b-receivables', orgId] });
    qc.invalidateQueries({ queryKey: ['invoices'] });
    qc.invalidateQueries({ queryKey: ['customer-ledger'] });
    qc.invalidateQueries({ queryKey: ['customer-ledger-rpc'] });
  };

  const issue = useMutation({
    mutationFn: async () => {
      const { error } = await callUntypedRpc<string>('issue_pilgrimage_b2b_invoice', {
        _agreement_id: summary?.agreement_id, _vat_rate: Number(vatRate),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      refresh();
      toast({ title: 'تم إصدار الفاتورة وترحيل قيد الذمم' });
    },
    onError,
  });

  const collect = useMutation({
    mutationFn: async () => {
      const { error } = await callUntypedRpc<string>('record_pilgrimage_b2b_collection', {
        _invoice_id: invoice?.id, _amount: Number(amount), _method: method,
        _treasury_account_id: account, _payment_date: paymentDate, _reference: reference.trim(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setAmount('');
      setReference('');
      refresh();
      toast({ title: 'تم تسجيل التحصيل وتحديث الرصيد' });
    },
    onError,
  });

  if (!canView) return null;
  if (summaryQ.isError) return <p className="text-sm text-destructive">تعذر تحميل حساب الاتفاق.</p>;
  if (summaryQ.isLoading) return <p className="text-sm text-muted-foreground">جاري تحميل حساب الاتفاق…</p>;
  if (!summary) return null;

  const paidCents = Math.round((invoice?.paid ?? 0) * 100);
  let scheduledCents = 0;
  const installments = summary.installments.map((row) => {
    const dueCents = Math.round(row.amount * 100);
    const coveredCents = Math.max(0, Math.min(dueCents, paidCents - scheduledCents));
    scheduledCents += dueCents;
    return { ...row, remaining: (dueCents - coveredCents) / 100 };
  });

  return (
    <section className="space-y-3 border-t pt-3" aria-label="حساب شركة السياحة">
      <h3 className="font-semibold">فاتورة الشركة والتحصيلات</h3>
      {pendingCancellation && <p className="text-sm text-muted-foreground">الإصدار والتحصيل متوقفان أثناء مراجعة الإلغاء.</p>}
      {cancelled && <p className="text-sm">أُلغي الاتفاق وأُقفل الرصيد المستحق.</p>}
      {!invoice && !cancelled && <p className="text-sm text-muted-foreground">
        الاتفاق معتمد وقيمته {money(summary.total, currency)}. بانتظار إصدار الفاتورة.
      </p>}
      {!invoice && canIssue && !pendingCancellation && !cancelled && (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <Label htmlFor="pilgrimage-b2b-vat">نسبة الضريبة ضمن الإجمالي (%)</Label>
            <Input id="pilgrimage-b2b-vat" type="number" min="0" max="100" step="0.01"
              value={vatRate} onChange={(event) => setVatRate(event.target.value)} />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button disabled={issue.isPending || summaryQ.isFetching || !vatRate || Number(vatRate) < 0 || Number(vatRate) > 100}>
                إصدار وترحيل الفاتورة
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>إصدار فاتورة اتفاق الشركة</AlertDialogTitle>
                <AlertDialogDescription>
                  سيُرحّل إجمالي {money(summary.total, currency)} على حساب الشركة المشترية بنسبة ضريبة {vatRate}% ضمن الإجمالي.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>رجوع</AlertDialogCancel>
                <AlertDialogAction onClick={() => issue.mutate()}>إصدار</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      {invoice && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="break-all">{invoice.number}</span>
            <span>المحصّل {money(invoice.paid, currency)}</span>
            <span>المتبقي {money(invoice.remaining, currency)}</span>
            {invoiceId && summary.sale_id && <Button asChild variant="link" size="sm">
              <Link to={`/pilgrimage?sale=${summary.sale_id}`}>فتح اتفاق المجموعة</Link>
            </Button>}
            {!invoiceId && <Button asChild variant="link" size="sm">
              <Link to={`/invoices?id=${invoice.id}`}>فتح الفاتورة</Link>
            </Button>}
            <Button asChild variant="link" size="sm">
              <Link to={`/customer-ledger?id=${summary.customer_id}`}>كشف حساب الشركة</Link>
            </Button>
          </div>
          {!cancelled && <ul className="space-y-1 text-sm">
            {installments.map((row) => <li key={row.sequence_no}>
              قسط {row.sequence_no} · {row.due_date} · {money(row.amount, currency)}
              {' · '}المتبقي {money(row.remaining, currency)}
              {row.remaining > 0 && row.due_date < today && <span className="text-destructive"> · متأخر</span>}
            </li>)}
          </ul>}
          {summary.receipts.length > 0 && (
            <div className="space-y-1 text-sm">
              <h4 className="font-medium">التحصيلات المسجلة</h4>
              <ul>
                {summary.receipts.map((receipt) => <li key={receipt.id}>
                  {receipt.date} · {receipt.method === 'cash' ? 'نقدي' : 'تحويل بنكي'}
                  {' · '}{receipt.reference} · {money(receipt.amount, currency)}
                </li>)}
              </ul>
            </div>
          )}
          {canCollect && !pendingCancellation && !cancelled && invoice.remaining > 0 && (
            <form className="grid gap-2 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); collect.mutate(); }}>
              <div>
                <Label htmlFor="pilgrimage-b2b-amount">المبلغ المستلم</Label>
                <Input id="pilgrimage-b2b-amount" type="number" required min="0.01"
                  max={invoice.remaining} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="pilgrimage-b2b-date">تاريخ التحصيل</Label>
                <Input id="pilgrimage-b2b-date" type="date" required min={invoice.issued_date} max={today}
                  value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} />
              </div>
              <div>
                <Label htmlFor="pilgrimage-b2b-method">طريقة التحصيل</Label>
                <Select value={method} onValueChange={(value: typeof method) => { setMethod(value); setAccount(''); }}>
                  <SelectTrigger id="pilgrimage-b2b-method"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                    <SelectItem value="cash">نقدي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pilgrimage-b2b-account">حساب الخزينة</Label>
                <Select value={account} onValueChange={setAccount} disabled={!accountsQ.data?.length}>
                  <SelectTrigger id="pilgrimage-b2b-account">
                    <SelectValue placeholder={accountsQ.isError ? 'تعذر تحميل الحسابات' :
                      accountsQ.isLoading ? 'جاري التحميل…' : accountsQ.data?.length ? 'اختر الحساب' : 'لا توجد حسابات مطابقة'} />
                  </SelectTrigger>
                  <SelectContent>
                    {accountsQ.data?.map((row) => <SelectItem key={row.id} value={row.id}>{row.account_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pilgrimage-b2b-reference">مرجع التحويل أو سند القبض</Label>
                <Input id="pilgrimage-b2b-reference" value={reference} required maxLength={120}
                  onChange={(event) => setReference(event.target.value)} />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={!account || !reference.trim() || collect.isPending || summaryQ.isFetching}>
                  تسجيل التحصيل
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}
