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
type Preview = {
  invoices: CancellationInvoice[];
  blocked_reason: string | null;
  can_refund: boolean;
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
      const { data, error } = await callUntypedRpc<Preview>('get_booking_cancellation_preview', { _booking: bookingId });
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
  const [result, setResult] = useState<SettlementLine[]>();
  const settled = result ?? preview?.settled?.result;
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
      const { data, error } = await callUntypedRpc<SettlementLine[]>('settle_booking_cancellation', {
        _booking: bookingId, _reason: reason.trim(), _fees: Object.fromEntries(lines.map(({ invoice, fee }) => [invoice.id, fee])), _expected: preview,
      });
      if (error) throw error;
      return data ?? [];
    },
    onSuccess: async data => {
      setResult(data);
      toast.success('تم اعتماد تسوية إلغاء الحجز');
      const keys = ['booking-cancellation', 'unified-bookings', 'booking-financials', 'booking-workspace',
        'booking-profit-cockpit', 'refund-balances', 'customer-ledger', 'invoices', 'supplier-payment-orders-all', 'sup360-bookings'];
      await Promise.all(keys.map(key => qc.invalidateQueries({ queryKey: [key] })));
      onSettled();
    },
    onError: error => {
      toast.error(errorMessage(error));
      onReload();
    },
  });
  const canSubmit = !!preview && !preview.blocked_reason && reason.trim().length >= 3
    && lines.every(line => line.valid) && !missingRefundPermission && !mutation.isPending;

  return (
    <Dialog open onOpenChange={open => { if (!open && !mutation.isPending) onClose(); }}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{cancelled ? 'تسوية الإلغاء' : 'إلغاء الحجز وتسوية الفواتير'}</DialogTitle>
          <DialogDescription>راجع الغرامة والمبلغ المتبقي ورصيد الاسترداد قبل الاعتماد.</DialogDescription>
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
