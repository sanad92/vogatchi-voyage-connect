import { useState } from 'react';
import { AlertTriangle, Plane, SearchCheck } from 'lucide-react';
import { toast } from 'sonner';
import type { BookingChangeRequest } from '@/hooks/useBookingChangeRequests';
import type { BookingChangeHandoff } from '@/hooks/useBookingChangeHandoffs';
import { useAirGdsBookingObservation, type AirGdsProvider, type AirGdsBookingObservation } from '@/hooks/useAirGdsBookingObservation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type StateByRequest = Record<string, AirGdsBookingObservation>;
const statusLabels: Record<string,string> = {
  CONFIRMED:'مقاطع الحجز ظاهرة بحالة تأكيد في رد Travelport',
  CANCELLED:'الحجز يحتوي على مقاطع ملغاة',
  SCHEDULE_CHANGE:'يوجد مؤشر تغيير جدول الرحلة (TK / UN) — يلزم مراجعة المورد',
  PENDING:'يوجد مقطع في حالة انتظار',
  WAITLISTED:'يوجد مقطع في قائمة الانتظار',
  UNKNOWN:'الحالة غير معروفة أو تضم حالات مختلفة؛ لا تعتبر الحجز مؤكدًا',
};
export function BookingAirGdsObservation({
  requests,handoffs,
}: {
  requests:BookingChangeRequest[];
  handoffs:BookingChangeHandoff[];
}) {
  const [results,setResults] = useState<StateByRequest>({});
  const [pending,setPending] = useState<string | null>(null);
  const observation = useAirGdsBookingObservation();
  const eligible = requests.filter(r => r.status === 'approved'
    && r.service_kind === 'flight'
    && handoffs.some(h => h.change_request_id === r.id
      && ['supplier_confirmed','finance_reviewed','execution_reported'].includes(h.status)));
  if (!eligible.length) return null;
  const check = (requestId:string,provider:AirGdsProvider) => {
    const key = requestId+':'+provider;
    setPending(key);
    setResults(previous => {const next={...previous};delete next[key];return next;});
    observation.mutate({requestId,provider},{
      onSuccess:data => setResults(previous => ({...previous,[key]:data})),
      onError:(error:Error) => toast.error(error.message || 'تعذر الاستعلام عن الحجز'),
      onSettled:() => setPending(null),
    });
  };
  const message=(result:AirGdsBookingObservation) => {
    if (result.state === 'enterprise_contract_required') {
      return 'Amadeus Enterprise لسه محتاج عقد API معتمد ومخطط قراءة PNR؛ واجهة Self-Service القديمة توقفت، ومفيش استعلام خارجي اتنفذ.';
    }
    if (result.state === 'not_configured') {
      return 'الربط غير مفعّل للشركة أو بيانات اعتماد المورد غير متاحة. لم يتم إجراء استعلام خارجي.';
    }
    if (result.state === 'reference_not_linked') {
      return 'رقم الحجز غير مطابق لسجل طيران واحد لنفس الشركة والحجز وبهوية المزود المطلوب.';
    }
    return 'المورد لم يرجع نتيجة قابلة للتحقق. لا تعتبر التذكرة أو التعديل مؤكدًا.';
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Plane className="w-4 h-4" /> قراءة حالة حجز الطيران — Amadeus / Travelport
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          تحقق يدوي للقراءة فقط عن مرجع الحجز الأصلي المرتبط بطلب تعديل معتمد.
          لا يؤكد التذكرة، ولا ينفذ إصدار أو إعادة إصدار أو تغيير أو استرداد.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {eligible.map(request => (
          <div key={request.id} className="rounded-md border p-3 space-y-2">
            <p className="font-medium text-sm">{request.description}</p>
            <div className="flex flex-wrap gap-2">
              {(['amadeus','travelport'] as const).map(provider => {
                const key=request.id+':'+provider;
                const result=results[key];
                return (
                  <div key={provider} className="space-y-2">
                    <Button size="sm" variant="outline" disabled={observation.isPending}
                      onClick={() => check(request.id,provider)}>
                      <SearchCheck className="w-4 h-4 ml-1" />
                      {pending===key ? 'جاري التحقق…' : 'فحص '+(provider==='amadeus'?'Amadeus':'Travelport')}
                    </Button>
                    {result && (
                      <div className="max-w-sm text-xs space-y-1">
                        {result.state === 'provider_reservation_observed' ? (
                          <>
                            <Badge variant="outline">حالة حجز فقط، وليس اعتماد تعديل</Badge>
                            <p>{statusLabels[result.reservationStatus || 'UNKNOWN']}</p>
                            <p className="text-muted-foreground">
                              {result.environment==='production'?'بيئة الإنتاج':'بيئة ما قبل الإنتاج'}
                              {' · '}{result.checkedAt
                                ? new Date(result.checkedAt).toLocaleString('ar-EG'):'وقت غير محدد'}
                            </p>
                          </>
                        ) : (
                          <p className="text-amber-700 dark:text-amber-400" role="status">{message(result)}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          حتى حالة CONFIRMED لا تثبت إصدار التذكرة ولا قبول تغيير التاريخ أو الرحلة.
          قارِن التذكرة والمقاطع والتعديل المطلوب بمستند أصلي مستقل قبل اعتماد التنفيذ.
        </p>
      </CardContent>
    </Card>
  );
}
