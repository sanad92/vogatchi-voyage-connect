import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { callUntypedRpc } from '@/lib/supabaseRpc';

type CancellationInvoice = { id: string; number: string; currency: string; due: number; paid: number };
type SettlementLine = { invoice_id: string; number: string; currency: string; fee: number; remaining: number; refund: number; refund_id: string | null };
type CustomerPreview = {
  invoices: CancellationInvoice[];
  blocked_reason: string | null;
  can_refund: boolean;
  settled: { at: string; result: SettlementLine[] } | null;
};

type SupplierLine = {
  id: string; order_id: string | null; supplier: string | null; reference: string | null; currency: string; amount: number; paid: number; refunded: number;
};
type SupplierResult = SupplierLine & {
  fee: number; remaining: number; refund: number; refund_id: string | null; fee_order_id: string | null; confirmation: string; override_reason?: string | null;
};
type ClosedSupplierOrder = { id: string; number: string; supplier_name: string | null; confirmation: string };
type Preview = { policy_estimates?: { customer: Record<string, number>; suppliers: Record<string, number> }; customer: CustomerPreview; suppliers: SupplierLine[]; supplier_result: SupplierResult[] | null; closed_supplier_orders: ClosedSupplierOrder[] };
type SupplierTerms = Record<string, { fee?: string; reference?: string; override_reason?: string }>;

const money = (amount: number, currency: string) => `${amount.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${currency}`;
const cents = (amount: number) => Math.round(amount * 100);
const errorMessage = (error: unknown) => error && typeof error === 'object' && 'message' in error
  ? String(error.message) : 'تعذر إكمال تسوية الإلغاء.';

export function useBookingCancellation(bookingId?: string, enabled = false) {
  return useQuery({
    queryKey: ['booking-cancellation', bookingId],
    enabled: !!bookingId && enabled,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<Preview>('get_booking_cancellation_workflow', { _booking: bookingId });
      if (error) throw error;
      if (!data) throw new Error('تعذر تحميل معاينة الإلغاء.');
      return data;
    },
  });
}

export function BookingCancellationDialog({
  bookingId, cancelled, preview, loadError, onReload, onClose, onSettled,
}: {
  bookingId: string;
  cancelled: boolean;
  preview?: Preview;
  loadError: unknown;
  onReload: () => void;
  onClose: () => void;
  onSettled: () => void;
}) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [fees, setFees] = useState<Record<string, string>>({});
  const [supplierTerms, setSupplierTerms] = useState<SupplierTerms>({});
  const [result, setResult] = useState<Preview>();
  const customer = preview?.customer;
  const customerResult = (result ?? preview)?.customer.settled?.result;
  const supplierResult = (result ?? preview)?.supplier_result;
  const settled = !!customerResult && (!!supplierResult || preview?.suppliers.length === 0);
  const lines = (customer?.settled ? [] : customer?.invoices ?? []).map(invoice => {
    const suggestedFee = preview?.policy_estimates?.customer[invoice.id];
    const raw = fees[invoice.id] ?? (suggestedFee == null ? '' : String(suggestedFee));
    const fee = Number(raw);
    const due = cents(invoice.due);
    const paid = cents(invoice.paid);
    const valid = /^\d+(\.\d{1,2})?$/.test(raw) && Number.isFinite(fee) && cents(fee) <= due + paid;
    return { invoice, fee, raw, suggestedFee, valid, remaining: Math.max(cents(fee) - paid, 0) / 100, refund: Math.max(paid - cents(fee), 0) / 100 };
  });
  const suppliers = (preview?.suppliers ?? []).map(line => {
    const suggestedFee = preview?.policy_estimates?.suppliers[line.id];
    const entered = supplierTerms[line.id];
    const terms = {
      fee: entered?.fee ?? (suggestedFee == null ? '' : String(suggestedFee)),
      reference: entered?.reference ?? '',
      override_reason: entered?.override_reason ?? '',
    };
    const fee = Number(terms.fee);
    const requiresReason = suggestedFee != null && terms.fee !== '' && cents(suggestedFee) !== cents(fee);
    const netPaid = cents(line.paid) - cents(line.refunded);
    const valid = /^\d+(\.\d{1,2})?$/.test(terms.fee) && Number.isFinite(fee)
      && cents(fee) <= cents(line.amount - line.refunded) && !!terms.reference.trim()
      && (!requiresReason || terms.override_reason.trim().length >= 3);
    return { line, terms, fee, valid, suggestedFee, requiresReason, remaining: Math.max(cents(fee) - netPaid, 0) / 100,
      refund: Math.max(netPaid - cents(fee), 0) / 100 };
  });
  const missingRefundPermission = !customer?.can_refund && lines.some(line => line.valid && line.refund > 0);
  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await callUntypedRpc<Preview>('settle_booking_cancellation_workflow', {
        _booking: bookingId, _reason: reason.trim(), _fees: Object.fromEntries(lines.map(({ invoice, fee }) => [invoice.id, fee])),
        _supplier_terms: Object.fromEntries(suppliers.map(({ line, fee, terms }) => [line.id, { fee, reference: terms.reference.trim(), override_reason: terms.override_reason.trim() || undefined }])),
        _expected: preview,
      });
      if (error) throw error;
      if (!data) throw new Error('تعذر إكمال تسوية الإلغاء.');
      return data;
    },
    onSuccess: async data => {
      setResult(data);
      qc.setQueryData(['booking-cancellation', bookingId], data);
      toast.success('تم اعتماد تسوية إلغاء الحجز');
      const keys = ['booking-cancellation', 'unified-bookings', 'booking-financials', 'booking-workspace',
        'booking-profit-cockpit', 'refund-balances', 'customer-ledger', 'invoices', 'workspace-invoices', 'workspace-timeline',
        'supplier-payment-orders', 'supplier-aging-details-v2', 'aging-control-totals-v2', 'supplier-ledger',
        'supplier-payment-orders-all', 'travel-calendar', 'supplier-ledger-rpc', 'sup360-bookings', 'sup360-pos', 'sup360-invoices'];
      await Promise.all(keys.map(key => qc.invalidateQueries({ queryKey: [key] })));
      onSettled();
    },
    onError: error => {
      toast.error(errorMessage(error));
      onReload();
    },
  });
  const canSubmit = !!preview && (!!customer?.settled || (!customer?.blocked_reason && reason.trim().length >= 3))
    && lines.every(line => line.valid) && suppliers.every(line => line.valid) && !missingRefundPermission && !mutation.isPending;

  return (
    <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose(); }}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cancelled ? 'تسوية الإلغاء' : 'إلغاء الحجز وتسوية الحسابات'}</DialogTitle>
          <DialogDescription>سجّل شروط الإلغاء المؤكدة. عند الاعتماد، يسوّي النظام الفواتير وأوامر الدفع وأرصدة الاسترداد.</DialogDescription>
        </DialogHeader>
        {settled ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">تم اعتماد تسوية إلغاء الحجز</p>
            {customerResult?.map(line => (
              <div className="rounded-md border p-3 text-sm" key={line.invoice_id}>
                <Link className="font-medium underline" to={`/invoices?id=${line.invoice_id}`}>{line.number}</Link>
                <p>المتبقي للتحصيل {money(line.remaining, line.currency)}</p>
                {line.refund_id && <p>رصيد محفظة العميل {money(line.refund, line.currency)} · <Link className="underline" to="/refund-balances">فتح المحفظة</Link></p>}
              </div>
            ))}
            {(result ?? preview)?.closed_supplier_orders.map(order => (
              <div className="space-y-1 rounded-md border p-3 text-sm" key={order.id}>
                <p className="font-medium">{order.supplier_name || order.number}</p>
                <Link className="block underline" to={`/payment-orders?id=${order.id}`}>أمر الدفع الملغي</Link>
                <p>{order.confirmation}</p>
              </div>
            ))}
            {supplierResult?.map(line => (
              <div className="space-y-1 rounded-md border p-3 text-sm" key={line.id}>
                <p className="font-medium">{line.supplier || line.reference || 'المورد'}</p>
                <p>المتبقي للمورد {money(line.remaining, line.currency)}</p>
                {line.override_reason && <p>سبب اختلاف الغرامة عن السياسة · {line.override_reason}</p>}
                {line.order_id && <Link className="block underline" to={`/payment-orders?id=${line.order_id}`}>أمر الدفع الملغي</Link>}
                {line.fee_order_id && <Link className="block underline" to={`/payment-orders?id=${line.fee_order_id}`}>أمر دفع غرامة المورد</Link>}
                {line.refund_id && <p>رصيد الاسترداد من المورد {money(line.refund, line.currency)} · <Link className="underline" to="/refund-balances">فتح المحفظة</Link></p>}
              </div>
            ))}
            <DialogFooter>
              <Button asChild variant="outline"><Link to={`/payment-orders?booking_id=${bookingId}`}>مراجعة أوامر دفع المورد</Link></Button>
              <Button type="button" onClick={onClose}>تم</Button>
            </DialogFooter>
          </div>
        ) : loadError ? (
          <div className="space-y-2" role="alert">
            <p className="text-sm text-destructive">{errorMessage(loadError)}</p>
            <Button type="button" variant="outline" onClick={onReload}>إعادة المحاولة</Button>
          </div>
        ) : !preview ? <p className="text-sm text-muted-foreground">جاري تحميل المعاينة...</p>
        : customer?.blocked_reason && !customer.settled ? <p role="alert" className="text-sm text-destructive">{customer.blocked_reason}</p>
        : (
          <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (canSubmit) mutation.mutate(); }}>
            {!customer?.settled && lines.length === 0 && <p className="text-sm text-muted-foreground">الحجز لا توجد له فواتير صادرة مؤهلة للتسوية.</p>}
            {lines.map(({ invoice, raw, suggestedFee, valid, remaining, refund }) => (
              <div className="space-y-2 rounded-md border p-3" key={invoice.id}>
                <p className="text-sm font-semibold">{invoice.number}</p>
                <p className="text-sm text-muted-foreground">المستحق حاليًا {money(invoice.due, invoice.currency)} · المدفوع المؤهل {money(invoice.paid, invoice.currency)}</p>
                <Label htmlFor={`cancel-fee-${invoice.id}`}>غرامة الإلغاء على العميل ({invoice.currency})</Label>
                <Input id={`cancel-fee-${invoice.id}`} type="number" min="0" max={(cents(invoice.due) + cents(invoice.paid)) / 100} step="0.01"
                  required value={raw} disabled={mutation.isPending} onChange={event => setFees({ ...fees, [invoice.id]: event.target.value })} />
                <p className="text-xs text-muted-foreground">{suggestedFee == null ? 'أدخل الغرامة المتفق عليها، أو صفر للإلغاء المجاني.' : `حسب السياسة المسجلة · ${money(suggestedFee, invoice.currency)}`}</p>
                {valid && <div className="grid gap-1 text-sm sm:grid-cols-2">
                  <p>المتبقي للتحصيل {money(remaining, invoice.currency)}</p>
                  <p>رصيد محفظة العميل {money(refund, invoice.currency)}</p>
                </div>}
              </div>
            ))}
            {missingRefundPermission && <p role="alert" className="text-sm text-destructive">تسوية المبلغ المدفوع تتطلب صلاحية اعتماد الاستردادات.</p>}
            {suppliers.length > 0 && (
              <fieldset className="space-y-3">
                <legend className="mb-2 text-sm font-semibold">تأكيد إلغاء المورد</legend>
                {suppliers.map(({ line, terms, valid, suggestedFee, requiresReason, remaining, refund }) => (
                  <div className="space-y-2 rounded-md border p-3" key={line.id}>
                    <p className="text-sm font-semibold">{line.supplier || 'المورد'} {line.reference && `· ${line.reference}`}</p>
                    <p className="text-sm text-muted-foreground">قيمة المستند {money(line.amount, line.currency)} · المدفوع {money(line.paid, line.currency)}</p>
                    {line.refunded > 0 && <p className="text-sm text-muted-foreground">استرداد مسجل {money(line.refunded, line.currency)}</p>}
                    <Label htmlFor={`supplier-fee-${line.id}`}>غرامة المورد المؤكدة ({line.currency})</Label>
                    <Input id={`supplier-fee-${line.id}`} type="number" min="0" max={line.amount - line.refunded} step="0.01"
                      placeholder="0 للإلغاء المجاني" value={terms.fee} required disabled={mutation.isPending}
                      onChange={event => setSupplierTerms({ ...supplierTerms, [line.id]: { ...supplierTerms[line.id], fee: event.target.value } })} />
                    {suggestedFee != null && <p className="text-xs text-muted-foreground">حسب السياسة المسجلة · {money(suggestedFee, line.currency)}</p>}
                    {requiresReason && <>
                      <Label htmlFor={`supplier-override-${line.id}`}>سبب اختلاف الغرامة عن السياسة</Label>
                      <Input id={`supplier-override-${line.id}`} required minLength={3} maxLength={500} value={terms.override_reason}
                        disabled={mutation.isPending} onChange={event => setSupplierTerms({ ...supplierTerms, [line.id]: { ...supplierTerms[line.id], override_reason: event.target.value } })} />
                    </>}
                    <Label htmlFor={`supplier-ref-${line.id}`}>مرجع تأكيد المورد</Label>
                    <Input id={`supplier-ref-${line.id}`} placeholder="رقم الإلغاء أو مرجع رسالة المورد" value={terms.reference} required
                      maxLength={150} disabled={mutation.isPending}
                      onChange={event => setSupplierTerms({ ...supplierTerms, [line.id]: { ...supplierTerms[line.id], reference: event.target.value } })} />
                    {valid && <div className="grid gap-1 text-sm sm:grid-cols-2">
                      <p>المتبقي للمورد {money(remaining, line.currency)}</p>
                      <p>رصيد الاسترداد من المورد {money(refund, line.currency)}</p>
                    </div>}
                  </div>
                ))}
              </fieldset>
            )}
            {!customer?.settled && <div className="space-y-2">
              <Label htmlFor="booking-cancellation-reason">سبب الإلغاء</Label>
              <Textarea id="booking-cancellation-reason" value={reason} onChange={event => setReason(event.target.value)}
                required minLength={3} maxLength={500} disabled={mutation.isPending} />
            </div>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>رجوع</Button>
              <Button type="submit" variant="destructive" disabled={!canSubmit}>{mutation.isPending ? 'جاري الاعتماد...' : 'اعتماد الإلغاء والتسوية'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
