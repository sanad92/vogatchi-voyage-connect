import { AlertTriangle, Calculator, RefreshCw } from 'lucide-react';
import { useBookingProfitCockpit } from '@/hooks/useBookingProfitCockpit';
import type { BookingFinancials } from '@/hooks/useBookingFinancials';
import type { BookingChangeRequest } from '@/hooks/useBookingChangeRequests';
import type { BookingChangeHandoff } from '@/hooks/useBookingChangeHandoffs';
import { BookingAmendmentExecutionExceptions } from './BookingAmendmentExecutionExceptions';
import type { BookingSourceEvidence, SourceEvidenceType } from '@/hooks/useBookingChangeSourceEvidence';
import { useBookingAllocationReview } from '@/hooks/useBookingAllocationReview';
import type { EvidenceAllocationState } from '@/lib/tripFile/allocationReview';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TYPE_LABELS: Record<SourceEvidenceType, string> = {
  customer_invoice: 'فاتورة العميل',
  supplier_invoice: 'فاتورة المورد',
  customer_payment: 'تحصيل العميل',
  supplier_payment: 'مدفوعات المورد',
  generated_document: 'مستند مولّد',
};
const STATE_LABELS: Record<EvidenceAllocationState, string> = {
  source_not_visible: 'المصدر غير ظاهر حاليًا',
  void_or_reversed: 'المستند ملغي أو العملية معكوسة',
  data_incomplete: 'بيانات غير مكتملة للمراجعة',
  allocation_conflict: 'تخصيص يحتاج تصحيح أو مراجعة',
  over_allocated: 'التخصيص أكبر من قيمة المستند',
  no_matching_allocation: 'لا يوجد تخصيص مطابق',
  partially_allocated: 'تخصيص جزئي في السجلات',
  allocated_in_records: 'التخصيصات تغطي القيمة في السجلات فقط',
  not_a_payment_document: 'مستند توثيقي — ليس تسوية مالية',
};
const isWarning = (status: EvidenceAllocationState) =>
  !['allocated_in_records', 'not_a_payment_document'].includes(status);
const money = (v: number | null | undefined, ccy: string | null | undefined) =>
  typeof v === 'number' && Number.isFinite(v)
    ? `${v.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${ccy || '(بدون عملة)'}`
    : '—';

export function BookingAmendmentFinancialReview({
  bookingId,
  requests,
  handoffs,
  financials,
  evidence,
  onRefreshSource,
}: {
  bookingId: string;
  requests: BookingChangeRequest[];
  handoffs: BookingChangeHandoff[];
  financials: BookingFinancials;
  evidence: BookingSourceEvidence[];
  onRefreshSource: () => void;
}) {
  const allocations = useBookingAllocationReview(bookingId, financials, evidence);
  const cockpit = useBookingProfitCockpit(bookingId);

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4" /> مراجعة تسويات التعديل والمستندات المرتبطة
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            فحص للقراءة فقط: بيطابق مراجع الفواتير والمدفوعات مع تخصيصاتها المحاسبية
            لنفس الشركة والحجز، وبيعرض ملخص التسوية الأساسي من Booking Profit Cockpit.
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={allocations.isFetching || cockpit.isFetching}
          onClick={() => { onRefreshSource(); void allocations.refetch(); void cockpit.refetch(); }}>
          <RefreshCw className="h-4 w-4 ml-1" /> تحديث
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {cockpit.isLoading ? (
          <p className="text-sm text-muted-foreground">جاري تحميل ملخص الحجز المالي…</p>
        ) : cockpit.isError ? (
          <p className="text-sm text-destructive" role="alert">
            تعذر تحميل حسابات الحجز من النظام المالي الأساسي:
            {' '}{(cockpit.error as Error)?.message || 'الخدمة غير متاحة'}
          </p>
        ) : cockpit.data && (
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-semibold">ملخص الحجز ككل — لا يخص التعديل وحده</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">فواتير العميل / المحصل / المتبقي</p>
                <p>
                  {money(cockpit.data.summary.customer_invoiced, cockpit.data.booking.currency)}
                  {' / '}{money(cockpit.data.summary.customer_collected, cockpit.data.booking.currency)}
                  {' / '}{money(cockpit.data.summary.customer_remaining, cockpit.data.booking.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">فواتير المورد / المدفوع / المتبقي</p>
                <p>
                  {money(cockpit.data.summary.supplier_invoiced, cockpit.data.booking.currency)}
                  {' / '}{money(cockpit.data.summary.supplier_paid, cockpit.data.booking.currency)}
                  {' / '}{money(cockpit.data.summary.supplier_remaining, cockpit.data.booking.currency)}
                </p>
              </div>
            </div>
            {cockpit.data.warnings.length > 0 && (
              <div className="space-y-1">
                {cockpit.data.warnings.slice(0, 5).map((warning, i) => (
                  <p className="text-xs text-amber-700 dark:text-amber-400" key={i}>
                    <AlertTriangle className="h-3 w-3 inline ml-1" />{warning}
                  </p>
                ))}
                {cockpit.data.warnings.length > 5 && (
                  <p className="text-xs text-muted-foreground">
                    توجد ملاحظات مالية إضافية في شاشة Financials.
                  </p>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              الأرقام مأخوذة من محرك ربحية الحجز الموجود بالفعل، وليست مجموعًا جديدًا
              أو إثباتًا لوصول الحوالة للبنك أو وصول مبلغ مسترد للعميل.
            </p>
          </div>
        )}

        {allocations.tooManyIds || allocations.incompleteData ? (
          <div role="alert" className="rounded-lg border border-amber-500/30 p-3 text-sm text-amber-700 dark:text-amber-400">
            بيانات التخصيصات كبيرة أو غير مكتملة؛ مش ممكن نعتبر المقارنة المالية شاملة.
            راجع سجلات الحسابات الأصلية قبل اعتماد أي نتيجة.
          </div>
        ) : allocations.isLoading ? (
          <p className="text-sm text-muted-foreground">جاري فحص تخصيصات الفواتير والمدفوعات…</p>
        ) : allocations.isError ? (
          <p role="alert" className="text-sm text-destructive">
            تعذر قراءة تخصيصات المدفوعات: {(allocations.error as Error)?.message || 'خدمة الحسابات غير متاحة'}
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-semibold">
              مطابقة مستندات التعديل ({allocations.review.length} رابط)
            </p>
            {!allocations.review.length && (
              <p className="text-xs text-muted-foreground">
                اربط مستندًا ماليًا بطلب التعديل أولًا عشان تبدأ المراجعة.
              </p>
            )}
            {allocations.review.map(line => (
              <div className="border rounded-lg p-3 space-y-2" key={line.evidenceId}>
                <div className="flex justify-between gap-2 flex-wrap items-center">
                  <p className="font-medium text-sm">
                    {TYPE_LABELS[line.type]} · {line.sourceId.slice(0, 8)}
                  </p>
                  <Badge variant={isWarning(line.state) ? 'destructive' : 'outline'}>
                    {STATE_LABELS[line.state]}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                  <span>قيمة المستند: {money(line.amount, line.currency)}</span>
                  <span>تخصيصات مسجلة: {money(line.allocated, line.currency)}</span>
                  {line.recordedPaid != null && (
                    <span>حقل المسدد في الفاتورة: {money(line.recordedPaid, line.currency)}</span>
                  )}
                </div>
                {line.changedSinceLink && (
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    حالة أو مبلغ أو عملة المستند اتغيرت عن وقت الربط.
                  </p>
                )}
                {line.inconsistencies.map((warning, i) => (
                  <p key={i} className="text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 inline ml-1" />{warning}
                  </p>
                ))}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-amber-700 dark:text-amber-400">
          لا توجد هنا شهادة «تمت التسوية» ولا زر صرف أو استرداد. حتى التخصيص الكامل
          على الفاتورة لا يؤكد تنفيذ تعديل المورد أو وصول الأموال للطرف الآخر.
          راجع المستندات الأصلية وتفاصيل تخصيص الدفعات قبل اتخاذ القرار.
        </p>
      </CardContent>
    </Card>
    <BookingAmendmentExecutionExceptions
      orgId={financials.booking.organization_id}
      bookingId={bookingId}
      bookingStatus={financials.booking.status}
      workflowStage={financials.booking.workflow_stage}
      requests={requests}
      handoffs={handoffs}
      evidence={evidence}
      allocations={allocations.review}
      dataComplete={Boolean(allocations.isSuccess && !allocations.incompleteData
        && cockpit.isSuccess && financials)}
    />
    </>
  );
}
