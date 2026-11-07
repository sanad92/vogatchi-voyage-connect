import { useRef, useState } from 'react';
import { BookingAmendmentHandoffPanel } from './BookingAmendmentHandoffPanel';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle2, ClipboardList, RefreshCw, Send, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgId } from '@/hooks/useOrgId';
import {
  useBookingChangeRequests,
  useCreateBookingChangeRequest,
  useDecideBookingChangeRequest,
  type BookingChangeKind,
  type BookingChangeService,
  type BookingChangeRequest,
} from '@/hooks/useBookingChangeRequests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const CHANGE_TYPES: Record<BookingChangeKind, string> = {
  dates: 'تعديل التواريخ',
  travellers: 'تعديل المسافرين',
  room: 'تعديل الغرف',
  service: 'إضافة أو تعديل خدمة',
  cancellation: 'طلب إلغاء',
  other: 'تعديل آخر',
};
const SERVICE_TYPES: Record<BookingChangeService, string> = {
  hotel: 'فندق', flight: 'طيران', transport: 'انتقالات', car: 'تأجير سيارة',
};
const STATUSES = {
  pending: 'بانتظار مراجعة المدير',
  approved: 'موافقة إدارية — لم يُنفذ التعديل',
  rejected: 'مرفوض',
} as const;
const money = (amount: number | null | undefined, currency?: string | null) =>
  amount == null ? '—' : `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency || ''}`;

function asOptionalAmount(raw: string): number | null {
  if (!raw.trim()) return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(raw.trim())) {
    throw new Error('اكتب قيمة صحيحة بدون أكثر من رقمين بعد العلامة العشرية');
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || Math.abs(value) > 1_000_000_000_000) {
    throw new Error('قيمة المبلغ خارج الحدود المسموح بها');
  }
  return value;
}

export function BookingAmendmentsTab({
  bookingId, bookingCurrency,
}: { bookingId: string; bookingCurrency?: string | null }) {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const changeRequests = useBookingChangeRequests(bookingId);
  const create = useCreateBookingChangeRequest(bookingId);
  const decide = useDecideBookingChangeRequest(bookingId);
  const requestKeyRef = useRef<string | null>(null);

  const [kind, setKind] = useState<BookingChangeKind>('dates');
  const [service, setService] = useState<BookingChangeService | 'none'>('none');
  const [reference, setReference] = useState('');
  const [description, setDescription] = useState('');
  const [selling, setSelling] = useState('');
  const [cost, setCost] = useState('');
  const [currency, setCurrency] = useState((bookingCurrency || 'EGP').toUpperCase());
  const [review, setReview] = useState<{ id: string; approve: boolean } | null>(null);
  const [reviewNote, setReviewNote] = useState('');

  const markChanged = () => { requestKeyRef.current = null; };
  const { data: canReview = false, isError: managerCheckFailed } = useQuery({
    queryKey: ['booking-amendments-manager', orgId, user?.id],
    enabled: !!orgId && !!user?.id,
    queryFn: async () => {
      if (!orgId || !user?.id) return false;
      const client = supabase as any;
      const [member, permission] = await Promise.all([
        client.from('organization_members').select('role,is_active')
          .eq('organization_id', orgId).eq('user_id', user.id).maybeSingle(),
        client.rpc('has_org_permission', { _org_id: orgId, _permission: 'bookings_confirm' }),
      ]);
      if (member.error) throw member.error;
      if (permission.error) throw permission.error;
      return !!member.data?.is_active
        && ['owner', 'admin', 'manager'].includes(String(member.data?.role))
        && permission.data === true;
    },
  });

  const submit = () => {
    try {
      if (description.trim().length < 10 || description.trim().length > 2000) {
        throw new Error('اكتب وصفًا واضحًا للتعديل بين 10 و2000 حرف');
      }
      const sellingDelta = asOptionalAmount(selling);
      const costDelta = asOptionalAmount(cost);
      if ((sellingDelta != null || costDelta != null) && !/^[A-Z]{3}$/.test(currency.trim().toUpperCase())) {
        throw new Error('حدد عملة التقدير بحروف ISO الثلاثة، مثل EGP أو USD');
      }
      if (!requestKeyRef.current) requestKeyRef.current = crypto.randomUUID();
      create.mutate({
        bookingId,
        requestKey: requestKeyRef.current,
        kind,
        description: description.trim(),
        serviceKind: service === 'none' ? null : service,
        serviceReference: reference.trim() || null,
        sellingDelta, costDelta,
        currency: sellingDelta != null || costDelta != null ? currency.trim().toUpperCase() : null,
      }, {
        onSuccess: ({ replayed }) => {
          toast.success(replayed ? 'هذا الطلب مسجل بالفعل' : 'تم تسجيل مقترح التعديل للمراجعة');
          requestKeyRef.current = null;
          setDescription(''); setReference(''); setSelling(''); setCost('');
          setKind('dates'); setService('none');
        },
        onError: (error: Error) => toast.error(error.message || 'تعذر تسجيل طلب التعديل'),
      });
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  const confirmDecision = (request: BookingChangeRequest) => {
    if (!review || review.id !== request.id) return;
    if (!review.approve && reviewNote.trim().length < 3) {
      toast.error('اذكر سبب الرفض (3 أحرف على الأقل)');
      return;
    }
    decide.mutate({ requestId: request.id, approve: review.approve, note: reviewNote.trim() }, {
      onSuccess: ({ already_decided }) => {
        if (already_decided) toast.info('تم اتخاذ قرار على الطلب من قبل؛ تم تحديث السجل');
        else toast.success(review.approve ? 'تم تسجيل الموافقة الإدارية' : 'تم تسجيل الرفض');
        setReview(null); setReviewNote('');
      },
      onError: (error: Error) => toast.error(error.message || 'تعذر تسجيل القرار'),
    });
  };

  const requests = changeRequests.data || [];
  const pending = requests.filter(x => x.status === 'pending');

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4" /> طلب تعديل على ملف الرحلة
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            ده مقترح لتعديل التواريخ أو المسافرين أو الغرف أو الخدمات. حتى بعد موافقة المدير،
            الحجز والفاتورة ومدفوعات الموردين لا تتغير تلقائيًا؛ تنفيذ التعديل يتم من وحداتها الأصلية.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>نوع التعديل</Label>
              <Select value={kind} onValueChange={v => { setKind(v as BookingChangeKind); markChanged(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(CHANGE_TYPES) as [BookingChangeKind,string][]).map(([key,label]) =>
                    <SelectItem key={key} value={key}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>الخدمة المرتبطة (اختياري)</Label>
              <Select value={service} onValueChange={v => { setService(v as BookingChangeService | 'none'); markChanged(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">الرحلة بالكامل / غير محدد</SelectItem>
                  {(Object.entries(SERVICE_TYPES) as [BookingChangeService,string][]).map(([key,label]) =>
                    <SelectItem key={key} value={key}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>مرجع الخدمة عند المورد (اختياري)</Label>
              <Input value={reference} maxLength={80} placeholder="مرجع فندق أو PNR أو رقم انتقال"
                onChange={e => { setReference(e.target.value); markChanged(); }} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>وصف المطلوب والتفاصيل الحالية والجديدة</Label>
              <Textarea rows={3} value={description} maxLength={2000}
                placeholder="مثال: تعديل إحدى الغرف من دبل إلى تريبل، مع انتظار تأكيد التوفر من المورد"
                onChange={e => { setDescription(e.target.value); markChanged(); }} />
              <p className="text-xs text-muted-foreground">{description.trim().length}/2000 حرف (الحد الأدنى 10)</p>
            </div>
            <div className="space-y-1">
              <Label>فرق البيع المتوقع (+ زيادة / − خصم)</Label>
              <Input type="number" step="0.01" value={selling} placeholder="اختياري"
                onChange={e => { setSelling(e.target.value); markChanged(); }} />
            </div>
            <div className="space-y-1">
              <Label>فرق تكلفة المورد المتوقع (+ زيادة / − تخفيض)</Label>
              <Input type="number" step="0.01" value={cost} placeholder="اختياري"
                onChange={e => { setCost(e.target.value); markChanged(); }} />
            </div>
            {(selling.trim() || cost.trim()) && (
              <div className="space-y-1">
                <Label>عملة التقدير (لا يتم تحويل العملة تلقائيًا)</Label>
                <Input value={currency} maxLength={3} placeholder="EGP / SAR / USD"
                  onChange={e => { setCurrency(e.target.value.toUpperCase()); markChanged(); }} />
              </div>
            )}
          </div>
          {selling.trim() && cost.trim() && /^-?\d+(\.\d{1,2})?$/.test(selling.trim()) && /^-?\d+(\.\d{1,2})?$/.test(cost.trim()) && (
            <p className="text-sm font-medium">
              التغير المتوقع في الربح: {money(Number(selling) - Number(cost), currency)}
            </p>
          )}
          <p className="text-xs text-amber-700 dark:text-amber-400">
            المبالغ تقديرية وغير معتمدة محاسبيًا. لا يتم تعديل ربح الحجز الفعلي إلا بعد تسجيل المستندات والعمليات المعتمدة.
          </p>
          <Button disabled={create.isPending || !orgId} onClick={submit}>
            <Send className="h-4 w-4 ml-1" /> {create.isPending ? 'جاري التسجيل…' : 'تسجيل طلب التعديل'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <div className="space-y-1">
            <CardTitle className="text-base">سجل طلبات تعديل الرحلة</CardTitle>
            <p className="text-xs text-muted-foreground">التعديلات المرفوضة والمعتمدة محفوظة؛ القرار لا يغيّر الحجوزات تلقائيًا.</p>
          </div>
          <Button size="sm" variant="outline" disabled={changeRequests.isFetching} onClick={() => changeRequests.refetch()}>
            <RefreshCw className="h-4 w-4 ml-1" /> تحديث
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {changeRequests.isLoading ? (
            <p className="text-sm text-muted-foreground">جاري تحميل الطلبات…</p>
          ) : changeRequests.isError ? (
            <div role="alert" className="p-3 border border-destructive/30 rounded-md text-sm text-destructive flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              تعذر تحميل التعديلات: {(changeRequests.error as Error)?.message || 'الخدمة غير متاحة'}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2 items-center">
                <Badge variant="outline">{pending.length} بانتظار المراجعة</Badge>
                <Badge variant="secondary">{requests.length} طلب معروض (آخر 200)</Badge>
                {managerCheckFailed && <span className="text-xs text-destructive">تعذر التحقق من صلاحيات المدير</span>}
              </div>
              {!requests.length && (
                <p className="text-sm text-muted-foreground">لا يوجد سجل تعديلات لهذا الحجز حتى الآن.</p>
              )}
              {requests.map(item => {
                const choosing = review?.id === item.id;
                const isSelfReview = item.requested_by === user?.id;
                return (
                  <div key={item.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex flex-wrap justify-between gap-2 items-center">
                      <p className="font-medium text-sm">
                        {CHANGE_TYPES[item.change_kind] || 'تعديل'}
                        {item.service_kind ? ` · ${SERVICE_TYPES[item.service_kind]}` : ''}
                      </p>
                      <Badge variant={item.status === 'rejected' ? 'destructive' : item.status === 'approved' ? 'secondary' : 'outline'}>
                        {STATUSES[item.status] || item.status}
                      </Badge>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{item.description}</p>
                    {item.service_reference && <p className="text-xs text-muted-foreground">مرجع المورد: {item.service_reference}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>الطلب: {new Date(item.requested_at).toLocaleString('ar-EG')}</span>
                      {item.reviewed_at && <span>قرار المدير: {new Date(item.reviewed_at).toLocaleString('ar-EG')}</span>}
                      {item.estimate_currency && (
                        <span>
                          فرق البيع: {money(item.proposed_selling_delta, item.estimate_currency)} ·
                          فرق التكلفة: {money(item.proposed_cost_delta, item.estimate_currency)}
                        </span>
                      )}
                    </div>
                    {item.review_note && <p className="text-xs text-muted-foreground">تعليق المدير: {item.review_note}</p>}
                    {item.status === 'pending' && canReview && !isSelfReview && !choosing && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" disabled={decide.isPending}
                          onClick={() => { setReview({ id: item.id, approve: true }); setReviewNote(''); }}>
                          <CheckCircle2 className="h-4 w-4 ml-1" /> مراجعة الموافقة
                        </Button>
                        <Button size="sm" variant="outline" disabled={decide.isPending}
                          onClick={() => { setReview({ id: item.id, approve: false }); setReviewNote(''); }}>
                          <XCircle className="h-4 w-4 ml-1" /> مراجعة الرفض
                        </Button>
                      </div>
                    )}
                    {item.status === 'pending' && isSelfReview && canReview && (
                      <p className="text-xs text-amber-700">لا يمكن للشخص مراجعة طلب قدّمه بنفسه.</p>
                    )}
                    {choosing && (
                      <div className="rounded-md bg-muted/50 p-3 space-y-2">
                        <p className="text-sm font-medium">{review.approve ? 'تأكيد الموافقة الإدارية' : 'تأكيد رفض المقترح'}</p>
                        <p className="text-xs text-muted-foreground">
                          القرار لا ينفذ استردادًا أو إصدار تذكرة أو تعديلًا ماليًا. لابد من استكمال SOP والإجراءات الأصلية.
                        </p>
                        <Textarea value={reviewNote} rows={2} maxLength={1000}
                          placeholder={review.approve ? 'ملاحظة اختيارية' : 'سبب الرفض — مطلوب'}
                          onChange={e => setReviewNote(e.target.value)} />
                        <div className="flex gap-2">
                          <Button size="sm" disabled={decide.isPending || (!review.approve && reviewNote.trim().length < 3)}
                            onClick={() => confirmDecision(item)}>
                            <ShieldCheck className="h-4 w-4 ml-1" /> {decide.isPending ? 'جاري الحفظ…' : 'تسجيل القرار'}
                          </Button>
                          <Button size="sm" variant="outline" disabled={decide.isPending}
                            onClick={() => { setReview(null); setReviewNote(''); }}>إلغاء</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>
      <BookingAmendmentHandoffPanel
        bookingId={bookingId}
        approvedRequests={requests.filter(x => x.status === 'approved')}
      />
    </div>
  );
}
