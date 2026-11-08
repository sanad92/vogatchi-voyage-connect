import { AlertTriangle, ClipboardCheck, ShieldAlert } from 'lucide-react';
import type { BookingChangeRequest } from '@/hooks/useBookingChangeRequests';
import type { BookingChangeHandoff } from '@/hooks/useBookingChangeHandoffs';
import type { BookingSourceEvidence } from '@/hooks/useBookingChangeSourceEvidence';
import type { EvidenceReviewLine } from '@/lib/tripFile/allocationReview';
import { assessAmendmentExecutionExceptions } from '@/lib/tripFile/executionExceptions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  orgId: string;
  bookingId: string;
  bookingStatus: string | null;
  workflowStage?: string | null;
  requests: BookingChangeRequest[];
  handoffs: BookingChangeHandoff[];
  evidence: BookingSourceEvidence[];
  allocations: EvidenceReviewLine[];
  dataComplete: boolean;
};

const STATE_LABEL = {
  blocked: 'توجد موانع أو بيانات غير موثوقة',
  needs_human_review: 'مطلوب استكمال المراجعة الداخلية',
  internal_records_documented: 'السجلات الداخلية مكتملة — المصدر الخارجي غير متحقق',
} as const;

export function BookingAmendmentExecutionExceptions(props: Props) {
  const results = assessAmendmentExecutionExceptions({
    organizationId: props.orgId,
    bookingId: props.bookingId,
    bookingStatus: props.bookingStatus,
    workflowStage: props.workflowStage,
    requests: props.requests,
    handoffs: props.handoffs,
    evidence: props.evidence,
    allocations: props.allocations,
    dataComplete: props.dataComplete,
  });
  if (!results.length) return null;
  const requestById = new Map(props.requests.map(request => [request.id, request]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex gap-2 items-center">
          <ShieldAlert className="h-4 w-4" /> فحص استثناءات تنفيذ تعديلات الرحلة
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          ده تقرير تحقق للقراءة فقط. بيفحص سجلات الموافقة، إفادة المورد، الفصل بين الموظفين،
          مستندات الحسابات وأي تخصيصات مش متطابقة. لا يُصدر موافقة تنفيذ إلكترونية.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {results.map(result => {
          const request = requestById.get(result.requestId);
          return (
            <div key={result.requestId} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap gap-2 items-center justify-between">
                <span className="font-medium text-sm">
                  {request?.description || 'طلب تعديل'}
                </span>
                <Badge variant={result.assessment === 'blocked' ? 'destructive' : 'outline'}>
                  {STATE_LABEL[result.assessment]}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                مستندات مرتبطة: {result.linkedDocuments} ·
                فحص المورد الخارجي: غير متصل حاليًا
              </p>
              {result.issues.length ? (
                <div className="space-y-1">
                  {result.issues.map(issue => (
                    <p key={issue.code} className="text-xs flex gap-1 items-start text-amber-700 dark:text-amber-400">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>{issue.detail}</span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-xs flex items-start gap-2 text-muted-foreground">
                  <ClipboardCheck className="h-4 w-4 shrink-0" />
                  المستندات والإفادات الداخلية متوافقة مع البيانات المقروءة فقط.
                  يلزم التحقق المستقل من نظام المورد والسداد البنكي قبل اعتبار التعديل منفذًا.
                </p>
              )}
            </div>
          );
        })}
        <p className="text-xs text-amber-700 dark:text-amber-400">
          حتى لو التقرير قال إن السجلات الداخلية مكتملة، لا يوجد اتصال مؤكد حاليًا
          بتحقق المورد الخارجي أو البنك. ممنوع تفسيره كتصريح لتعديل الحجز أو إصدار
          تذكرة أو دفع أو رد مبلغ؛ ده بيتم من الوحدات الأصلية بعد الاعتمادات اللازمة.
        </p>
      </CardContent>
    </Card>
  );
}
