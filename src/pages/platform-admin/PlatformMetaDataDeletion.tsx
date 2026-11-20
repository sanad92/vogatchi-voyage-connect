import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { callUntypedRpc } from '@/lib/supabaseRpc';

const pageSize = 50;
const statuses = {
  received: 'بانتظار المراجعة',
  in_review: 'قيد المراجعة',
  verification_required: 'بانتظار التحقق',
  completed: 'اكتملت المعالجة',
};
type Status = keyof typeof statuses;
type NextStatus = Exclude<Status, 'received'>;
type Review = {
  request_id: string;
  received_at: string;
  review_status: Status;
  updated_at: string;
};
type Activity = {
  event_id: string;
  action: NextStatus | 'subject_viewed';
  actor_id: string;
  created_at: string;
  case_reference: string | null;
};
const caseReferenceFormat = /^[a-zA-Z0-9][a-zA-Z0-9._/-]{2,79}$/;
const confirmationCodeFormat = /^(?:[0-9a-f]{32}|[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})$/i;
const dateFormat = new Intl.DateTimeFormat('ar-EG', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo',
});

export default function PlatformMetaDataDeletion() {
  const { user } = useOptimizedAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<Status | ''>('');
  const [codeInput, setCodeInput] = useState('');
  const [code, setCode] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Review | null>(null);
  const [caseReference, setCaseReference] = useState('');
  const [verified, setVerified] = useState(false);
  const reviewKey = ['platform-meta-deletion', user?.id];
  const activityKey = ['platform-meta-deletion-activity', user?.id, selected?.request_id];

  const cases = useQuery({
    queryKey: [...reviewKey, status, code, page],
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<Review[]>('list_meta_deletion_reviews', {
        _status: status || null, _offset: page * pageSize, _confirmation_code: code || null,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const activity = useQuery({
    queryKey: activityKey,
    enabled: !!selected,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<Activity[]>('get_meta_deletion_review_activity', {
        _request_id: selected.request_id,
      });
      if (error) throw error;
      return data ?? [];
    },
  });

  const reveal = useMutation({
    gcTime: 0,
    mutationFn: async (requestId: string) => {
      const { data, error } = await callUntypedRpc<string>('get_meta_deletion_subject', { _request_id: requestId });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: activityKey }); },
  });

  const update = useMutation({
    mutationFn: async (nextStatus: NextStatus) => {
      const { error } = await callUntypedRpc('set_meta_deletion_review', {
        _request_id: selected.request_id,
        _expected_status: selected.review_status,
        _new_status: nextStatus,
        _case_reference: nextStatus === 'completed' ? caseReference.trim() : null,
      });
      if (error) throw error;
    },
    onSuccess: (_response, nextStatus) => {
      setSelected((current) => current && { ...current, review_status: nextStatus });
      reveal.reset();
      setCaseReference('');
      setVerified(false);
      void queryClient.invalidateQueries({ queryKey: reviewKey });
      void queryClient.invalidateQueries({ queryKey: activityKey });
    },
  });

  const clearSelection = (row: Review | null) => {
    setSelected(row);
    setCaseReference('');
    setVerified(false);
    reveal.reset();
    update.reset();
  };
  const controlsBusy = reveal.isPending || update.isPending;
  const rows = cases.data ?? [];

  return (
    <section className="space-y-5 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold">طلبات حذف بيانات Meta</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          راجع هوية صاحب الطلب ونطاق بياناته، وسجّل نتيجة المعالجة في سجل الطلب.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label htmlFor="meta-deletion-status">حالة الطلب</Label>
              <select
                id="meta-deletion-status"
                className="mt-1 block h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={status}
                disabled={controlsBusy}
                onChange={(event) => {
                  setStatus(event.target.value as Status | '');
                  setPage(0);
                  clearSelection(null);
                }}
              >
                <option value="">كل الحالات</option>
                {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </div>
            <Button variant="outline" type="button" size="sm" onClick={() => void cases.refetch()}>تحديث</Button>
          </div>
          <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => {
            event.preventDefault();
            const input = codeInput.trim();
            if (input && !confirmationCodeFormat.test(input)) return;
            setCode(input);
            setStatus('');
            setPage(0);
            clearSelection(null);
          }}>
            <div>
              <Label htmlFor="meta-deletion-confirmation">رمز التأكيد</Label>
              <Input id="meta-deletion-confirmation" dir="ltr" className="mt-1" type="text" autoComplete="off" maxLength={36}
                value={codeInput} onChange={(event) => setCodeInput(event.target.value)} />
            </div>
            <Button type="submit" size="sm" variant="outline"
              disabled={controlsBusy || !!codeInput.trim() && !confirmationCodeFormat.test(codeInput.trim())}>بحث</Button>
            {code && <Button type="button" size="sm" variant="ghost" disabled={controlsBusy}
              onClick={() => { setCodeInput(''); setCode(''); setPage(0); clearSelection(null); }}>مسح البحث</Button>}
          </form>

          {cases.isPending ? <p role="status">جارٍ تحميل الطلبات…</p>
            : cases.isError ? <p role="alert">تعذّر تحميل طلبات الحذف. أعد المحاولة.</p>
            : rows.length === 0 ? <p>لا توجد طلبات في هذه الصفحة.</p>
            : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>معرّف الطلب الداخلي</TableHead>
                    <TableHead>تاريخ الاستلام</TableHead>
                    <TableHead>آخر تحديث</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>المراجعة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, pageSize).map((row) => (
                    <TableRow key={row.request_id}>
                      <TableCell className="font-mono text-xs"><bdi data-no-translate>{row.request_id}</bdi></TableCell>
                      <TableCell>{dateFormat.format(new Date(row.received_at))}</TableCell>
                      <TableCell>{dateFormat.format(new Date(row.updated_at))}</TableCell>
                      <TableCell><Badge variant="outline">{statuses[row.review_status]}</Badge></TableCell>
                      <TableCell>
                        <Button type="button" size="sm" variant="outline" disabled={controlsBusy} onClick={() => clearSelection(row)}>
                          فتح الطلب
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" disabled={page === 0 || cases.isFetching || controlsBusy}
              onClick={() => { setPage(page - 1); clearSelection(null); }}>السابق</Button>
            <Button type="button" size="sm" variant="outline" disabled={rows.length <= pageSize || cases.isFetching || controlsBusy}
              onClick={() => { setPage(page + 1); clearSelection(null); }}>التالي</Button>
          </div>
        </CardContent>
      </Card>

      {selected && (
        <Card>
          <CardContent className="space-y-4 p-4">
            <header className="flex flex-wrap justify-between gap-2">
              <div className="space-y-1">
                <h2 className="font-semibold">مراجعة الطلب</h2>
                <bdi className="font-mono text-xs" data-no-translate>{selected.request_id}</bdi>
              </div>
              <Button type="button" size="sm" variant="ghost" disabled={controlsBusy} onClick={() => clearSelection(null)}>إغلاق</Button>
            </header>
            <Badge variant="outline">{statuses[selected.review_status]}</Badge>

            {['received', 'verification_required'].includes(selected.review_status) && (
              <div><Button type="button" size="sm" disabled={controlsBusy} onClick={() => update.mutate('in_review')}>بدء المراجعة</Button></div>
            )}

            {selected.review_status === 'in_review' && (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  {reveal.data ? (
                    <>
                      <bdi className="font-mono text-sm" data-no-translate>{reveal.data}</bdi>
                      <Button type="button" variant="outline" size="sm" onClick={() => reveal.reset()}>إخفاء معرّف Meta</Button>
                    </>
                  ) : (
                    <Button type="button" variant="outline" size="sm" disabled={controlsBusy}
                      onClick={() => reveal.mutate(selected.request_id)}>إظهار معرّف Meta وتسجيل الاطلاع</Button>
                  )}
                  {reveal.isError && <p role="alert" className="text-sm text-destructive">تعذّر إظهار المعرّف.</p>}
                </div>
                <div><Button type="button" variant="outline" size="sm" disabled={controlsBusy}
                  onClick={() => update.mutate('verification_required')}>تعليق الطلب لحين التحقق</Button></div>
                <div className="space-y-2 rounded-md border p-3">
                  <Label htmlFor="meta-deletion-case-reference">مرجع المعالجة الداخلي</Label>
                  <Input id="meta-deletion-case-reference" autoComplete="off" dir="ltr" value={caseReference} maxLength={80}
                    onChange={(event) => setCaseReference(event.target.value)} />
                  <p className="text-xs text-muted-foreground">استخدم مرجع المعالجة المثبتة في سجلّك الداخلي.</p>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={verified} onChange={(event) => setVerified(event.target.checked)} />
                    تحققت من هوية صاحب الطلب وانتهت معالجة البيانات في نطاقه.
                  </label>
                  <Button type="button" size="sm" disabled={!verified || !caseReferenceFormat.test(caseReference.trim()) || controlsBusy}
                    onClick={() => update.mutate('completed')}>تسجيل اكتمال المعالجة</Button>
                </div>
              </>
            )}

            {update.isError && (
              <p className="text-sm text-destructive" role="alert">
                تعذّر تحديث الطلب. حدّث القائمة وأعد فتح الطلب قبل المحاولة.
              </p>
            )}
            <h3 className="text-sm font-semibold">سجل المراجعة</h3>
            {activity.isPending ? <p role="status" className="text-sm">جارٍ تحميل السجل…</p>
              : activity.isError ? <p role="alert" className="text-sm">تعذّر تحميل سجل المراجعة.</p>
              : !activity.data?.length ? <p className="text-sm">لم تُسجّل إجراءات مراجعة بعد.</p>
              : (
                <ul className="space-y-2">
                  {activity.data.map((event) => (
                    <li key={event.event_id} className="space-y-1 rounded-md border p-2 text-sm">
                      <p>{event.action === 'subject_viewed' ? 'اطلاع على معرّف Meta' : statuses[event.action]}</p>
                      <p>{dateFormat.format(new Date(event.created_at))}</p>
                      <bdi className="block break-all font-mono text-xs" data-no-translate>{event.actor_id}</bdi>
                      {event.case_reference && <bdi className="block break-all font-mono text-xs" data-no-translate>{event.case_reference}</bdi>}
                    </li>
                  ))}
                </ul>
              )}
          </CardContent>
        </Card>
      )}
    </section>
  );
}
