import { useState } from 'react';
import { AlertTriangle, Plane, SearchCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAirReservationObservation, type AirReservationObservation } from '@/hooks/useAirReservationObservation';
import type { BookingChangeRequest } from '@/hooks/useBookingChangeRequests';
import type { BookingChangeHandoff } from '@/hooks/useBookingChangeHandoffs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type StateMap = Record<string, AirReservationObservation>;
const labels: Record<NonNullable<AirReservationObservation['airStatus']>, string> = {
  confirmed: 'الحجز يحتوي على حالات مقاطع مؤكدة',
  cancelled: 'المقاطع المرتبطة بالحجز ملغاة',
  pending: 'مقاطع في انتظار التأكيد',
  modified: 'وردت حالة تعديل بالمقاطع',
  rejected: 'وردت حالة رفض بالمقاطع',
  waitlisted: 'مقاطع على قائمة الانتظار',
  mixed: 'حالات مقاطع مختلفة أو غير معروفة — تتطلب مراجعة',
  unknown: 'لا توجد معلومات كافية عن حالة مقاطع الطيران',
};

export function BookingAirProviderObservation({
  requests, handoffs,
}: {
  requests: BookingChangeRequest[];
  handoffs: BookingChangeHandoff[];
}) {
  const [results, setResults] = useState<StateMap>({});
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const lookup = useAirReservationObservation();

  const eligible = requests.filter(r => r.status === 'approved'
    && r.service_kind === 'flight'
    && handoffs.some(h => h.change_request_id === r.id &&
      ['supplier_confirmed','finance_reviewed','execution_reported'].includes(h.status)));
  if (!eligible.length) return null;

  const check = (requestId: string) => {
    setActiveRequestId(requestId);
    setResults(previous => {
      const next = {...previous};
      delete next[requestId];
      return next;
    });
    lookup.mutate(requestId, {
      onSuccess: result => setResults(previous => ({...previous,[requestId]:result})),
      onError: (e: Error) => toast.error(e.message || 'تعذر قراءة حجز الطيران'),
      onSettled: () => setActiveRequestId(null),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plane className="h-4 w-4" />
          مراجعة PNR من Travelport / Amadeus Enterprise
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          فحص يدوي للقراءة فقط: النظام يحدد المورد من حجز الطيران المسجل في شركتك،
          ويتحقق من المرجع الأصلي قبل أي استعلام خارجي. لا يُصدر تذاكر ولا يغير الحجوزات.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {eligible.map(request => {
          const result = results[request.id];
          return (
            <div key={request.id} className="border rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium">{request.description}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline"
                  disabled={lookup.isPending}
                  onClick={() => check(request.id)}>
                  <SearchCheck className="h-4 w-4 ml-1"/>
                  {activeRequestId===request.id ? 'جارٍ الاستعلام…' : 'فحص الـPNR عند المورد'}
                </Button>
                {result?.state==='provider_pnr_observed' && (
                  <Badge variant="outline">قراءة حجز فقط — ليست إثبات تنفيذ تعديل</Badge>
                )}
              </div>

              {result?.state==='provider_pnr_observed' && (
                <div className="space-y-1 text-sm">
                  <p>Travelport: {labels[result.airStatus || 'unknown']}</p>
                  <p className="text-xs text-muted-foreground">
                    البيئة: {result.environment==='production'?'إنتاج':'تجريبية'}
                    {' · '}وقت القراءة: {result.checkedAt
                      ? new Date(result.checkedAt).toLocaleString('ar-EG') : 'غير متوفر'}
                    {' · '}حالات المقاطع المقروءة: {result.segmentStatusSamples ?? 0}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    مش دليل على إصدار التذكرة أو تنفيذ التغيير المطلوب في التاريخ أو الاسم
                    أو الرحلة أو فرق السعر، حتى لو حالة المقطع Confirmed.
                  </p>
                </div>
              )}
              {result && result.state!=='provider_pnr_observed' && (
                <p className="text-xs text-amber-700 dark:text-amber-400" role="status">
                  {result.state==='enterprise_contract_required'
                    ? 'Amadeus Enterprise: يلزم ربط حساب وكالة معتمد وعقد API محدد؛ لم يتم الاستعلام من Amadeus.'
                    : result.state==='not_configured'
                    ? 'Travelport غير مفعّل للشركة حاليًا أو بيانات الوصول التجريبية غير مكتملة.'
                    : result.state==='source_not_unambiguous'
                    ? 'مرجع الـPNR غير مطابق لحجز طيران أصلي واحد ونفس الشركة؛ لم يتم الاتصال بالمورد.'
                    : 'تعذر تأكيد القراءة من المورد. لا تفسّر ذلك كإلغاء أو إصدار تذكرة.'}
                </p>
              )}
            </div>
          );
        })}
        <p className="flex gap-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0"/>
          Amadeus Self-Service قديمة وغير معتمدة للتكامل الجديد. مسار Enterprise
          ينتظر صلاحيات التعاقد ومواصفات الاسترجاع. نتيجة Travelport تخص حالة الـPNR
          فقط ولا تتحول تلقائيًا إلى حالة «تم التعديل» أو «تم إصدار التذكرة».
        </p>
      </CardContent>
    </Card>
  );
}
