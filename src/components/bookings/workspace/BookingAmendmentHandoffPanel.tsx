import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, ClipboardCheck, ExternalLink, RefreshCw, ShieldAlert } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import type { BookingChangeRequest } from '@/hooks/useBookingChangeRequests';
import { BookingAmendmentEvidencePanel } from './BookingAmendmentEvidencePanel';
import { BookingHotelbedsObservation } from './BookingHotelbedsObservation';
import {
  useBookingChangeHandoffs,
  useBookingHandoffAudit,
  useRecordBookingChangeHandoff,
  type HandoffAction,
  type HandoffStatus,
} from '@/hooks/useBookingChangeHandoffs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const STATUS_LABELS: Record<HandoffStatus, string> = {
  supplier_pending: 'ينتظر إفادة المورد',
  supplier_confirmed: 'تم تسجيل إفادة المورد — ينتظر مراجعة الحسابات',
  finance_reviewed: 'تم تسجيل مراجعة الحسابات — ينتظر إقرار التشغيل',
  execution_reported: 'تم تسجيل إقرار التشغيل — يحتاج تحققًا مستقلاً',
  blocked: 'المتابعة متوقفة — يلزم طلب جديد',
};
const ACTION_LABELS: Record<HandoffAction, string> = {
  supplier_confirm: 'تسجيل مرجع إفادة المورد',
  finance_verify: 'تسجيل مرجع مراجعة الحسابات',
  report_execution: 'تسجيل إقرار التشغيل',
  block: 'إيقاف متابعة التعديل',
};

const fmtDate = (date: string) => {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' });
};

/**
 * This records HUMAN attestations only. It has no side effect on supplier
 * reservations, source bookings, invoices, card charges or refunds.
 */
export function BookingAmendmentHandoffPanel({
  bookingId,
  approvedRequests,
}: {
  bookingId: string;
  approvedRequests: BookingChangeRequest[];
}) {
  const { user } = useOptimizedAuth();
  const { hasAllPermissions, hasPermission, userRole, loading, error: permissionError } =
    useSupabasePermissions();
  const canRead = !loading && !permissionError && hasAllPermissions(['bookings_view', 'financial_view']);
  const canSupplier = canRead && hasPermission('bookings_edit');
  const canFinance = canRead && hasPermission('financial_edit');
  const manager = ['owner','admin','manager'].includes(userRole || '');
  const canReport = canRead && manager && hasPermission('bookings_confirm');
  const handoffs = useBookingChangeHandoffs(bookingId, canRead);
  const audit = useBookingHandoffAudit(bookingId, canRead);
  const mutation = useRecordBookingChangeHandoff(bookingId);
  const [selected, setSelected] = useState<{ requestId: string; action: HandoffAction } | null>(null);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');

  const byRequest = useMemo(
    () => new Map((handoffs.data ?? []).map(h => [h.change_request_id, h])),
    [handoffs.data],
  );
  const eventsByRequest = useMemo(() => {
    const grouped = new Map<string, typeof audit.data>();
    (audit.data ?? []).forEach(event => {
      const group = grouped.get(event.change_request_id) ?? [];
      group.push(event);
      grouped.set(event.change_request_id, group);
    });
    return grouped;
  }, [audit.data]);

  if (!approvedRequests.length) return null;

  const choose = (requestId: string, action: HandoffAction) => {
    setSelected({ requestId, action });
    setReference('');
    setNote('');
  };

  const submit = () => {
    if (!selected) return;
    const ref = reference.trim();
    const txt = note.trim();
    if (selected.action !== 'block' && (ref.length < 4 || ref.length > 120)) {
      toast.error('اكتب مرجعًا واضحًا للمستند أو الحجز (من 4 إلى 120 حرفًا)');
      return;
    }
    if (['block','report_execution'].includes(selected.action) && txt.length < 10) {
      toast.error('اكتب شرحًا واضحًا للإجراء، 10 أحرف على الأقل');
      return;
    }
    mutation.mutate({
      requestId: selected.requestId,
      action: selected.action,
      reference: selected.action === 'block' ? null : ref,
      note: txt || null,
    }, {
      onSuccess: (result) => {
        toast.success(result.replayed ? 'الإفادة مسجلة سابقًا بنفس المرجع' : 'تم تسجيل الإفادة في سجل المتابعة');
        setSelected(null);
        setReference('');
        setNote('');
      },
      onError: (e: Error) => toast.error(e.message || 'تعذر تسجيل خطوة المتابعة'),
    });
  };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4" /> متابعة التعديلات المعتمدة مع المورد والحسابات
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            لا يتم تنفيذ الحجز أو الدفع أو الاسترداد من هنا. كل خطوة مجرد إفادة بشرية
            بمرجع يمكن مراجعته؛ لازم تتم العملية الحقيقية من وحدة الحجز/المالية الأصلية.
          </p>
        </div>
        {canRead && (
          <Button size="sm" variant="outline" disabled={handoffs.isFetching || audit.isFetching}
            onClick={() => { void handoffs.refetch(); void audit.refetch(); }}>
            <RefreshCw className="h-4 w-4 ml-1" /> تحديث
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">جاري التحقق من الصلاحيات…</p>
        ) : permissionError ? (
          <p className="text-sm text-destructive" role="alert">تعذر التحقق من صلاحيات الوصول للمتابعة.</p>
        ) : !canRead ? (
          <p className="text-sm text-muted-foreground">
            تفاصيل إثباتات المورد والحسابات متاحة فقط لمن لديهم صلاحية عرض الحجوزات والمالية.
          </p>
        ) : handoffs.isLoading || audit.isLoading ? (
          <p className="text-sm text-muted-foreground">جاري تحميل متابعة التعديلات…</p>
        ) : handoffs.isError || audit.isError ? (
          <p className="text-sm text-destructive flex items-center gap-2" role="alert">
            <AlertTriangle className="w-4 h-4" />
            تعذر تحميل المتابعة: {(handoffs.error as Error)?.message || (audit.error as Error)?.message}
          </p>
        ) : (
          approvedRequests.map(request => {
            const h = byRequest.get(request.id);
            const status: HandoffStatus = h?.status || 'supplier_pending';
            const events = eventsByRequest.get(request.id) ?? [];
            const isCurrent = selected?.requestId === request.id;
            const canSupplierNext = status === 'supplier_pending' && canSupplier;
            const canFinanceNext = status === 'supplier_confirmed' && canFinance
              && !!user?.id && user.id !== h?.supplier_confirmed_by;
            const canReportNext = status === 'finance_reviewed' && canReport
              && !!user?.id && user.id !== h?.finance_reviewed_by
              && user.id !== request.requested_by;
            const canBlock = canReport && status !== 'blocked' && status !== 'execution_reported';
            return (
              <div key={request.id} className="border rounded-lg p-3 space-y-3">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div className="space-y-1">
                    <p className="font-semibold text-sm">{request.description}</p>
                    <Badge variant={status === 'blocked' ? 'destructive' : 'outline'}>
                      {STATUS_LABELS[status]}
                    </Badge>
                  </div>
                </div>
                {h && (
                  <div className="grid gap-2 sm:grid-cols-3 text-xs">
                    <p>مرجع المورد: <span className="font-medium">{h.supplier_reference || '—'}</span></p>
                    <p>مرجع الحسابات: <span className="font-medium">{h.finance_reference || '—'}</span></p>
                    <p>مرجع إقرار التشغيل: <span className="font-medium">{h.execution_reference || '—'}</span></p>
                  </div>
                )}

                {events.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold">آخر الإفادات المسجلة</p>
                    {events.slice(0,4).map(event => (
                      <div key={event.id} className="text-xs border-r-2 border-border pr-2">
                        {ACTION_LABELS[event.action]} · {fmtDate(event.occurred_at)}
                        {event.note && <p className="text-muted-foreground whitespace-pre-wrap">{event.note}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {!isCurrent && (
                  <div className="flex flex-wrap gap-2">
                    {canSupplierNext && (
                      <Button size="sm" variant="outline" onClick={() => choose(request.id,'supplier_confirm')}>
                        <CheckCircle2 className="w-4 h-4 ml-1" /> تسجيل تأكيد المورد
                      </Button>
                    )}
                    {canFinanceNext && (
                      <Button size="sm" variant="outline" onClick={() => choose(request.id,'finance_verify')}>
                        <CheckCircle2 className="w-4 h-4 ml-1" /> مراجعة الحسابات
                      </Button>
                    )}
                    {canReportNext && (
                      <Button size="sm" variant="outline" onClick={() => choose(request.id,'report_execution')}>
                        <CheckCircle2 className="w-4 h-4 ml-1" /> تسجيل إقرار التشغيل
                      </Button>
                    )}
                    {canBlock && (
                      <Button size="sm" variant="outline" onClick={() => choose(request.id,'block')}>
                        <ShieldAlert className="w-4 h-4 ml-1" /> إيقاف المتابعة
                      </Button>
                    )}
                    {(status === 'supplier_confirmed' && !canFinanceNext) && (
                      <p className="text-xs text-muted-foreground">
                        تحتاج مراجعة موظف حسابات آخر غير مسجل إفادة المورد.
                      </p>
                    )}
                    {(status === 'finance_reviewed' && !canReportNext) && (
                      <p className="text-xs text-muted-foreground">
                        يحتاج إقرار مدير آخر غير مقدم الطلب ومراجع الحسابات.
                      </p>
                    )}
                    {status === 'execution_reported' && (
                      <div className="text-xs text-amber-700 dark:text-amber-400 flex gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        الإقرار لا يثبت بذاته تعديل الحجز لدى المورد أو تسوية المالية؛ راجع المستندات والمصدر الأصلي.
                      </div>
                    )}
                  </div>
                )}

                {isCurrent && selected && (
                  <div className="bg-muted/40 rounded-md border p-3 space-y-2">
                    <p className="text-sm font-medium">{ACTION_LABELS[selected.action]}</p>
                    {selected.action !== 'block' && (
                      <div className="space-y-1">
                        <Label>مرجع الإجراء الخارجي (إلزامي)</Label>
                        <Input value={reference} maxLength={120}
                          placeholder="رقم تأكيد المورد أو مستند الحسابات أو الحجز المعدّل"
                          onChange={e => setReference(e.target.value)} />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label>{selected.action === 'block' || selected.action === 'report_execution'
                        ? 'شرح الإجراء وسببه (إلزامي)' : 'ملاحظة إضافية (اختيارية)'}</Label>
                      <Textarea value={note} maxLength={1000} rows={2}
                        placeholder="اكتب تفاصيل يمكن الرجوع لها أثناء مراجعة المستندات"
                        onChange={e => setNote(e.target.value)} />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" disabled={mutation.isPending} onClick={submit}>
                        {mutation.isPending ? 'جاري التسجيل…' : 'تسجيل الإفادة'}
                      </Button>
                      <Button size="sm" variant="outline" disabled={mutation.isPending}
                        onClick={() => { setSelected(null); setReference(''); setNote(''); }}>إلغاء</Button>
                    </div>
                  </div>
                )}

                {status === 'blocked' && (
                  <p className="text-xs text-muted-foreground">
                    الطلب توقف نهائيًا. لو ظهرت شروط جديدة مع المورد، افتح طلب تعديل جديد وسجّل الموافقات المطلوبة من البداية.
                  </p>
                )}
              </div>
            );
          })
        )}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <ExternalLink className="w-3.5 h-3.5" />
          لإجراء تعديل فعلي أو مراجعة دفعة افتح تبويب البرنامج أو المالية داخل نفس ملف الحجز.
        </p>
      </CardContent>
    </Card>
    {canRead && handoffs.isSuccess && (
      <BookingHotelbedsObservation
        requests={approvedRequests}
        handoffs={handoffs.data ?? []}
      />
    )}
    {canRead && handoffs.isSuccess && approvedRequests.some(r => {
      const status = byRequest.get(r.id)?.status;
      return status && status !== 'supplier_pending';
    }) && (
      <BookingAmendmentEvidencePanel
        bookingId={bookingId}
        handoffs={handoffs.data ?? []}
        approvedRequests={approvedRequests.filter(r => {
          const status = byRequest.get(r.id)?.status;
          return status && status !== 'supplier_pending';
        })}
      />
    )}
    </>
  );
}
