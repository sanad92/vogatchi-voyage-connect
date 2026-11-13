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
type SupplierOrder = {
  id: string;
  number: string;
  supplier_name: string | null;
  amount: number;
  currency: string;
  blocked_reason: string | null;
};
type ClosedSupplierOrder = Omit<SupplierOrder, 'blocked_reason'> & { confirmation: string };
type CancellationResult = { invoices: SettlementLine[]; closed_supplier_orders: ClosedSupplierOrder[] };
type Preview = {
  invoices: CancellationInvoice[];
  blocked_reason: string | null;
  can_refund: boolean;
  supplier_orders: SupplierOrder[];
  closed_supplier_orders: ClosedSupplierOrder[];
  settled: { at: string; result: SettlementLine[] } | null;
};

const money = (amount: number, currency: string) => `${amount.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${currency}`;
const cents = (amount: number) => Math.round(amount * 100);
const errorMessage = (error: unknown) => error && typeof error === 'object' && 'message' in error
  ? String(error.message) : 'تعذر إكمال تسوية الإلغاء.';

export function useBookingCancellation(bookingId?: string, enabled = false) {
  return useQuery({
    queryKey: ['booking-cancellation', bookingId],
    enabled: !!bookingId && enabled,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<Preview>('get_booking_cancellation_with_supplier_preview', { _booking: bookingId });
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
  const [supplierReferences, setSupplierReferences] = useState<Record<string, string>>({});
  const [result, setResult] = useState<CancellationResult>();
  const settled = result?.invoices ?? preview?.settled?.result;
  const closedSupplierOrders = result?.closed_supplier_orders ?? preview?.closed_supplier_orders ?? [];
  const supplierOrders = preview?.supplier_orders ?? [];
  const supplierConfirmations = Object.fromEntries(supplierOrders
    .filter(order => !order.blocked_reason && supplierReferences[order.id]?.trim())
    .map(order => [order.id, supplierReferences[order.id].trim()]));
  const invalidSupplierReference = Object.values(supplierConfirmations).some(reference => reference.length < 3);
  const lines = (preview?.invoices ?? []).map(invoice => {
    const raw = fees[invoice.id] ?? '0';
    const fee = Number(raw);
    const due = cents(invoice.due);
    const paid = cents(invoice.paid);
    const valid = /^\d+(\.\d{1,2})?$/.test(raw) && Number.isFinite(fee) && cents(fee) <= due + paid;
    return { invoice, fee, valid, remaining: Math.max(cents(fee) - paid, 0) / 100, refund: Math.max(paid - cents(fee), 0) / 100 };
  });
  const missingRefundPermission = !preview?.can_refund && lines.some(line => line.refund > 0);
  const mutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await callUntypedRpc<CancellationResult>('settle_booking_cancellation_with_supplier', {
        _booking: bookingId,
        _reason: reason.trim(),
        _fees: Object.fromEntries(lines.map(({ invoice, fee }) => [invoice.id, fee])),
        _expected: preview,
        _supplier_confirmations: supplierConfirmations,
      });
      if (error) throw error;
      if (!data) throw new Error('تعذر إكمال تسوية الإلغاء.');
      return data;
    },
    onSuccess: async data => {
      setResult(data);
      toast.success('تم اعتماد تسوية إلغاء الحجز');
      const keys = ['booking-cancellation', 'unified-bookings', 'booking-financials', 'booking-workspace',
        'booking-profit-cockpit', 'refund-balances', 'customer-ledger', 'invoices', 'workspace-invoices', 'workspace-timeline',
        'supplier-payment-orders', 'supplier-payment-orders-all', 'supplier-aging-details-v2', 'aging-control-totals-v2',
        'supplier-ledger', 'sup360-bookings', 'sup360-invoices', 'sup360-pos'];
      await Promise.all(keys.map(key => qc.invalidateQueries({ queryKey: [key] })));
      onSettled();
    },
    onError: error => {
      toast.error(errorMessage(error));
      onReload();
    },
  });
  const canSubmit = !!preview && !preview.blocked_reason && reason.trim().length >= 3
    && lines.every(line => line.valid) && !missingRefundPermission && !invalidSupplierReference && !mutation.isPending;

  return (
    <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose(); }}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cancelled ? 'تسوية الإلغاء' : 'إلغاء الحجز وتسوية الفواتير'}</DialogTitle>
          <DialogDescription>راجع تسوية العميل ومستحقات المورد قبل اعتماد الإلغاء.</DialogDescription>
        </DialogHeader>
        {settled ? (
          <div className="space-y-3">
            <p className="text-sm font-medium">تم اعتماد تسوية إلغاء الحجز</p>
            {settled.map(line => (
              <div className="rounded-md border p-3 text-sm" key={line.invoice_id}>
                <Link className="font-medium underline" to={`/invoices?id=${line.invoice_id}`}>{line.number}</Link>
                <p>المتبقي للتحصيل {money(line.remaining, line.currency)}</p>
                {line.refund_id && <p>رصيد محفظة العميل {money(line.refund, line.currency)} · <Link className="underline" to="/refund-balances">فتح المحفظة</Link></p>}
              </div>
            ))}
            {closedSupplierOrders.length > 0 && (
              <section className="space-y-2" aria-label="مستحقات المورد المقفلة">
                <h3 className="text-sm font-semibold">تم إقفال مستحقات المورد التالية</h3>
                {closedSupplierOrders.map(order => (
                  <div className="rounded-md border p-3 text-sm" key={order.id}>
                    <Link className="font-medium underline" to={`/payment-orders?id=${order.id}`}>{order.number}</Link>
                    <p>{order.supplier_name} · {money(order.amount, order.currency)}</p>
                    <p>{order.confirmation}</p>
                  </div>
                ))}
              </section>
            )}
            <DialogFooter>
              {supplierOrders.some(order => !closedSupplierOrders.some(closed => closed.id === order.id)) && (
                <Button asChild variant="outline"><Link to={`/payment-orders?booking_id=${bookingId}`}>مراجعة أوامر دفع المورد</Link></Button>
              )}
              <Button type="button" onClick={onClose}>تم</Button>
            </DialogFooter>
          </div>
        ) : loadError ? (
          <div className="space-y-2" role="alert">
            <p className="text-sm text-destructive">{errorMessage(loadError)}</p>
            <Button type="button" variant="outline" onClick={onReload}>إعادة المحاولة</Button>
          </div>
        ) : !preview ? <p className="text-sm text-muted-foreground">جاري تحميل المعاينة...</p>
        : preview.blocked_reason ? <p role="alert" className="text-sm text-destructive">{preview.blocked_reason}</p>
        : (
          <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (canSubmit) mutation.mutate(); }}>
            {lines.length === 0 && <p className="text-sm text-muted-foreground">الحجز لا توجد له فواتير صادرة مؤهلة للتسوية.</p>}
            {lines.map(({ invoice, valid, remaining, refund }) => (
              <div className="space-y-2 rounded-md border p-3" key={invoice.id}>
                <p className="text-sm font-semibold">{invoice.number}</p>
                <p className="text-sm text-muted-foreground">المستحق حاليًا {money(invoice.due, invoice.currency)} · المدفوع المؤهل {money(invoice.paid, invoice.currency)}</p>
                <Label htmlFor={`cancel-fee-${invoice.id}`}>غرامة الإلغاء على العميل ({invoice.currency})</Label>
                <Input id={`cancel-fee-${invoice.id}`} type="number" min="0" max={(cents(invoice.due) + cents(invoice.paid)) / 100} step="0.01"
                  required value={fees[invoice.id] ?? '0'} disabled={mutation.isPending} onChange={event => setFees({ ...fees, [invoice.id]: event.target.value })} />
                {valid && <div className="grid gap-1 text-sm sm:grid-cols-2">
                  <p>المتبقي للتحصيل {money(remaining, invoice.currency)}</p>
                  <p>رصيد محفظة العميل {money(refund, invoice.currency)}</p>
                </div>}
              </div>
            ))}
            {missingRefundPermission && <p role="alert" className="text-sm text-destructive">تسوية المبلغ المدفوع تتطلب صلاحية اعتماد الاستردادات.</p>}
            {supplierOrders.length > 0 && (
              <section className="space-y-2" aria-labelledby="supplier-cancellation-heading">
                <h3 id="supplier-cancellation-heading" className="text-sm font-semibold">مستحقات المورد</h3>
                {supplierOrders.some(order => !order.blocked_reason) && (
                  <p className="text-sm text-muted-foreground">لو المورد أكد الإلغاء بدون غرامة، سجّل مرجع تأكيده هنا. إقفال أمر الدفع والفاتورة هيتم تلقائيًا عند اعتماد الإلغاء.</p>
                )}
                {supplierOrders.map(order => (
                  <div className="space-y-2 rounded-md border p-3 text-sm" key={order.id}>
                    <p className="font-medium">{order.supplier_name || order.number}</p>
                    <p className="text-muted-foreground">{order.number} · {money(order.amount, order.currency)}</p>
                    {order.blocked_reason ? <p className="text-muted-foreground">{order.blocked_reason}</p> : (
                      <>
                        <Label htmlFor={`supplier-confirmation-${order.id}`}>مرجع تأكيد الإلغاء المجاني من المورد</Label>
                        <Input id={`supplier-confirmation-${order.id}`} value={supplierReferences[order.id] ?? ''}
                          minLength={3} maxLength={500} disabled={mutation.isPending}
                          onChange={event => setSupplierReferences({ ...supplierReferences, [order.id]: event.target.value })} />
                      </>
                    )}
                  </div>
                ))}
              </section>
            )}
            <div className="space-y-2">
              <Label htmlFor="booking-cancellation-reason">سبب الإلغاء</Label>
              <Textarea id="booking-cancellation-reason" value={reason} onChange={event => setReason(event.target.value)}
                required minLength={3} maxLength={500} disabled={mutation.isPending} />
            </div>
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
