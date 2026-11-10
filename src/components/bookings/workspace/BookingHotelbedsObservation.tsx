import { useState } from 'react';
import { AlertTriangle, SearchCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useHotelbedsBookingObservation, type HotelbedsBookingStatusObservation } from '@/hooks/useHotelbedsBookingObservation';
import type { BookingChangeRequest } from '@/hooks/useBookingChangeRequests';
import type { BookingChangeHandoff } from '@/hooks/useBookingChangeHandoffs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type ObservationByRequest = Record<string, HotelbedsBookingStatusObservation>;
const statusLabel: Record<string, string> = {
  CONFIRMED: 'الحجز موجود عند المورد وحالته CONFIRMED',
  CANCELLED: 'الحجز ملغى عند المورد',
  MODIFIED: 'المورد يعرض حالة MODIFIED',
  UNKNOWN: 'حالة المورد غير معروفة؛ لا تعتبر الحجز مؤكدًا',
};
export function BookingHotelbedsObservation({
  requests, handoffs,
}: {
  requests: BookingChangeRequest[];
  handoffs: BookingChangeHandoff[];
}) {
  const [observations, setObservations] = useState<ObservationByRequest>({});
  const [pendingId, setPendingId] = useState<string | null>(null);
  const verification = useHotelbedsBookingObservation();

  const active = requests.filter(request =>
    request.status === 'approved'
    && request.service_kind === 'hotel'
    && handoffs.some(h => h.change_request_id === request.id &&
      ['supplier_confirmed','finance_reviewed','execution_reported'].includes(h.status)),
  );
  if (!active.length) return null;

  const check = (requestId: string) => {
    setPendingId(requestId);
    setObservations(previous => {
      const next = { ...previous };
      delete next[requestId];
      return next;
    });
    verification.mutate(requestId, {
      onSuccess: data => setObservations(previous => ({ ...previous, [requestId]: data })),
      onError: (error: Error) => toast.error(error.message || 'تعذر التواصل مع خدمة التحقق من المورد'),
      onSettled: () => setPendingId(null),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <SearchCheck className="h-4 w-4" /> قراءة حالة حجز الفندق لدى Hotelbeds
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          فحص يدوي للقراءة فقط. لا يعمل إلا إذا كان الحجز الأصلي مرتبطًا فعلًا بمرجع Hotelbeds
          وفعّل مسؤول النظام حساب المورد الخاص بالشركة. لا يجري تعديلًا أو إلغاءً أو استردادًا.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {active.map(request => {
          const result = observations[request.id];
          return (
            <div key={request.id} className="rounded-lg border p-3 space-y-2">
              <p className="text-sm font-medium">{request.description}</p>
              <div className="flex flex-wrap gap-2 items-center">
                <Button size="sm" variant="outline" disabled={verification.isPending}
                  onClick={() => check(request.id)}>
                  <SearchCheck className="h-4 w-4 ml-1" />
                  {pendingId === request.id ? 'جاري قراءة حالة المورد…' : 'فحص حالة الحجز عند المورد'}
                </Button>
                {result?.state === 'provider_booking_observed' && (
                  <Badge variant="outline">قراءة حالة الحجز — ليست اعتماد تعديل</Badge>
                )}
              </div>
              {result?.state === 'provider_booking_observed' && (
                <div className="text-sm space-y-1">
                  <p>{statusLabel[result.providerBookingStatus || 'UNKNOWN']}</p>
                  <p className="text-xs text-muted-foreground">
                    بيئة المورد: {result.environment === 'production' ? 'إنتاج' : 'اختبار'}
                    {' · '}وقت القراءة: {result.checkedAt
                      ? new Date(result.checkedAt).toLocaleString('ar-EG') : 'غير متوفر'}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    نتيجة GET تؤكد فقط الحالة التي أعادها المورد في وقت الفحص؛ لا تثبت
                    تنفيذ نوع الغرفة أو تغيير التاريخ أو فرق السعر المطلوب.
                  </p>
                </div>
              )}
              {result && result.state !== 'provider_booking_observed' && (
                <p role="status" className="text-xs text-amber-700 dark:text-amber-400">
                  {result.state === 'not_configured'
                    ? 'الربط غير مفعّل للشركة حاليًا، ولا يوجد أي تحقق خارجي.'
                    : result.state === 'reference_not_linked'
                    ? 'مرجع طلب التعديل غير مطابق لحجز Hotelbeds أصلي على نفس الشركة والرحلة.'
                    : 'المورد غير متاح أو لم يرجع قراءة صالحة؛ لا يمكن تأكيد حالة الحجز.'}
                </p>
              )}
            </div>
          );
        })}
        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          حتى لو كانت الحالة CONFIRMED، ده لا يثبت إن طلب التعديل اتنفذ.
          لا تُغيّر أي بيانات حجز أو فاتورة أو استرداد بناءً على قراءة الحالة وحدها.
        </p>
      </CardContent>
    </Card>
  );
}
