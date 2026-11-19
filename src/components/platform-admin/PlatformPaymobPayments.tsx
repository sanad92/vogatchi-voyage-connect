import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';

type Kind = 'void' | 'refund';
type Permissions = Record<Kind, boolean>;
type Action = {
  id: string; kind: Kind; status: string; amount_cents: number; reason: string;
  provider_action_id: string | null; requested_by: string | null; created_at: string;
};
type Payment = {
  id: string; organization_name: string | null; paymob_transaction_id: string | null;
  paymob_order_id: string | null; status: string; amount_cents: number; currency: string;
  payment_method: string | null; verified_subscription: boolean; occurred_at: string; actions: Action[];
};
type Mode = { configured: boolean; mode: 'live' | 'test' };
type ActionResult = { status: string; needs_provider_id?: boolean };
type Staff = Permissions & { email: string };
const states: Record<string, string> = {
  success: 'مدفوعة', paid: 'مدفوعة', pending: 'قيد الانتظار', expired: 'انتهت الجلسة',
  failed: 'فشلت', voided: 'أُلغيت', refunded: 'تم رد مبلغ', invalid_checkout: 'تحتاج مراجعة',
};
const actionNames = { void: 'إلغاء الدفعة (Void)', refund: 'استرداد (Refund)' };
const actionStates: Record<string, string> = {
  requested: 'قيد الإرسال', submitted: 'قيد المعالجة', succeeded: 'أكدها Paymob',
  rejected: 'لم تكتمل', unknown: 'تحتاج مطابقة مع Paymob',
};
const money = new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 2 });
const date = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Africa/Cairo' });
const pageSize = 25;

export function PlatformPaymobPermissions() {
  const qc = useQueryClient();
  const { user } = useOptimizedAuth();
  const key = ['platform-paymob-staff', user?.id];
  const staff = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_platform_paymob_staff');
      if (error) throw error;
      return data as Staff[];
    },
  });
  const save = useMutation({
    mutationFn: async (row: Staff) => {
      const { error } = await supabase.rpc('set_platform_paymob_staff_permissions', {
        p_email: row.email, p_can_void: row.void, p_can_refund: row.refund,
      });
      if (error) throw error;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: key });
      toast.success('تم تحديث صلاحيات Paymob');
    },
    onError: () => toast.error('تعذر تحديث صلاحيات Paymob'),
  });
  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">صلاحيات إجراءات Paymob</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">اختَر إجراءات كل حساب من الحسابات المالية المفعّلة.</p>
        {staff.isLoading && <p role="status">جارٍ تحميل الصلاحيات</p>}
        {staff.isError && <Button variant="outline" onClick={() => staff.refetch()}>إعادة تحميل الصلاحيات</Button>}
        {staff.data?.length === 0 && <p className="text-sm text-muted-foreground">أضف حسابًا ماليًا أولًا.</p>}
        {staff.data?.map((row) => (
          <div key={row.email} className="flex flex-wrap items-center gap-4 border-t py-3">
            <bdi className="me-auto break-all" data-no-translate>{row.email}</bdi>
            {(['void', 'refund'] as const).map((kind) => (
              <label key={kind} className="flex items-center gap-2 text-sm">
                <Switch checked={row[kind]} disabled={save.isPending}
                  onCheckedChange={(checked) => save.mutate({ ...row, [kind]: checked })} />
                {actionNames[kind]}
              </label>
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function PlatformPaymobPayments() {
  const qc = useQueryClient();
  const { user } = useOptimizedAuth();
  const key = ['platform-paymob-payments', user?.id];
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ kind: Kind; requestId: string; reason: string; amount: string } | null>(null);
  const [lookupId, setLookupId] = useState('');

  const list = useQuery({
    queryKey: [...key, 'list', search, status, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('list_platform_paymob_transactions', {
        p_search: search, p_status: status, p_offset: page * pageSize,
      });
      if (error) throw error;
      return data as Payment[];
    },
  });
  const permissions = useQuery({
    queryKey: [...key, 'permissions'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_paymob_permissions');
      if (error) throw error;
      return data as Permissions;
    },
  });
  const capabilities = useQuery({
    queryKey: [...key, 'capabilities'],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Mode>('platform-paymob-operations', { body: { command: 'capabilities' } });
      if (error) throw error;
      return data;
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: key });
  const run = useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const { data, error } = await supabase.functions.invoke<ActionResult>('platform-paymob-operations', { body });
      if (error || !data) throw error ?? new Error('No payment operation result');
      return data;
    },
    onSuccess: (result) => {
      if (result.needs_provider_id) toast.info('أدخل رقم عملية الفويد أو الريفند من Paymob للمطابقة.');
      else toast.info(actionStates[result.status] || 'تم تحديث الإجراء');
    },
    onError: () => toast.error('تعذر تأكيد نتيجة الإجراء. راجع السجل قبل إرسال طلب جديد.'),
    onSettled: async () => {
      setDraft(null);
      await refresh();
    },
  });

  const payment = list.data?.find((row) => row.id === paymentId);
  const successful = payment?.actions.filter((action) => action.status === 'succeeded') ?? [];
  const remaining = Math.max(0, (payment?.amount_cents ?? 0) - successful.reduce((total, action) => total + action.amount_cents, 0));
  const pending = payment?.actions.find((action) => ['requested', 'submitted', 'unknown'].includes(action.status));
  const isEligible = payment?.verified_subscription && ['success', 'refunded'].includes(payment.status) && remaining > 0 && !pending;
  const validateAmount = draft?.kind === 'refund' && /^\d{1,11}(?:\.\d{1,2})?$/.test(draft.amount)
    ? Math.round(Number(draft.amount) * 100) : 0;
  const openDraft = (kind: Kind) => setDraft({ kind, requestId: crypto.randomUUID(), reason: '', amount: (remaining / 100).toFixed(2) });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">عمليات Paymob</CardTitle>
        <Button variant="outline" size="sm" onClick={refresh}><RefreshCw aria-hidden="true" />تحديث العمليات</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
          event.preventDefault();
          setSearch(searchInput.trim());
          setPage(0);
        }}>
          <div className="min-w-56 flex-1 space-y-1.5">
            <Label htmlFor="platform-paymob-search">الشركة أو رقم العملية أو الطلب</Label>
            <Input id="platform-paymob-search" value={searchInput} maxLength={100} onChange={(event) => setSearchInput(event.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="platform-paymob-status">الحالة</Label>
            <select id="platform-paymob-status" className="flex h-10 rounded-md border border-input bg-background px-3"
              value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}>
              <option value="">كل الحالات</option>
              {Object.entries(states).filter(([id]) => id !== 'paid').map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </div>
          <Button type="submit" variant="outline"><Search aria-hidden="true" />بحث</Button>
        </form>
        {list.isLoading && <p role="status">جارٍ تحميل العمليات</p>}
        {list.isError && <p role="alert" className="text-sm text-destructive">تعذر تحميل العمليات. جرّب التحديث.</p>}
        {list.data?.length === 0 && <p className="text-sm text-muted-foreground">لا توجد عمليات مطابقة.</p>}
        {!!list.data?.length && (
          <Table>
            <TableHeader><TableRow>
              <TableHead>الشركة</TableHead><TableHead>معاملة Paymob</TableHead><TableHead>المبلغ</TableHead>
              <TableHead>الحالة</TableHead><TableHead>التاريخ</TableHead><TableHead>الإجراءات</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {list.data.slice(0, pageSize).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.organization_name || '—'}</TableCell>
                  <TableCell><bdi>{row.paymob_transaction_id || row.paymob_order_id || '—'}</bdi></TableCell>
                  <TableCell>{money.format(row.amount_cents / 100)} <bdi>{row.currency}</bdi></TableCell>
                  <TableCell>{states[row.status] || row.status}</TableCell>
                  <TableCell>{date.format(new Date(row.occurred_at))}</TableCell>
                  <TableCell><Button size="sm" variant="outline" onClick={() => {
                    setPaymentId(row.id); setDraft(null); setLookupId('');
                  }}>عرض التفاصيل</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>السابق</Button>
          <Button size="sm" variant="outline" disabled={(list.data?.length ?? 0) <= pageSize} onClick={() => setPage(page + 1)}>التالي</Button>
        </div>
      </CardContent>

      <Dialog open={Boolean(payment)} onOpenChange={(open) => { if (!open && !run.isPending) setPaymentId(null); }}>
        {payment && (
          <DialogContent dir="rtl" className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>تفاصيل عملية Paymob</DialogTitle>
              <DialogDescription>{payment.organization_name || '—'} · <bdi>{payment.paymob_transaction_id || payment.paymob_order_id}</bdi></DialogDescription>
            </DialogHeader>
            <p className="text-sm">{states[payment.status] || payment.status} · {money.format(payment.amount_cents / 100)} {payment.currency}</p>

            {capabilities.data?.mode === 'test' && <p className="text-sm text-muted-foreground">بيئة Paymob التجريبية</p>}
            {isEligible && (permissions.data?.void || permissions.data?.refund) && !capabilities.data?.configured && (
              <p className="text-sm text-muted-foreground">إجراءات Paymob غير مفعّلة في هذه البيئة.</p>
            )}
            {isEligible && capabilities.data?.configured && !draft && (
              <div className="flex flex-wrap gap-2">
                {permissions.data?.void && payment.payment_method === 'card' && successful.length === 0 && (
                  <Button size="sm" variant="outline" onClick={() => openDraft('void')}>{actionNames.void}</Button>
                )}
                {permissions.data?.refund && <Button size="sm" variant="outline" onClick={() => openDraft('refund')}>{actionNames.refund}</Button>}
              </div>
            )}

            {draft && (
              <form className="space-y-3 rounded-md border p-3" onSubmit={(event) => {
                event.preventDefault();
                run.mutate({
                  command: 'submit', request_id: draft.requestId, payment_id: payment.id, kind: draft.kind,
                  reason: draft.reason.trim(), ...(draft.kind === 'refund' ? { amount_cents: validateAmount } : {}),
                });
              }}>
                <p className="font-semibold">{actionNames[draft.kind]}</p>
                {draft.kind === 'refund' ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="paymob-refund-amount">مبلغ الاسترداد بالجنيه المصري</Label>
                    <Input id="paymob-refund-amount" dir="ltr" inputMode="decimal" required maxLength={14}
                      value={draft.amount} onChange={(event) => setDraft({ ...draft, amount: event.target.value })} />
                  </div>
                ) : <p className="text-sm">{money.format(payment.amount_cents / 100)} {payment.currency}</p>}
                <div className="space-y-1.5">
                  <Label htmlFor="paymob-action-reason">سبب الإجراء</Label>
                  <Textarea id="paymob-action-reason" required minLength={3} maxLength={300}
                    value={draft.reason} onChange={(event) => setDraft({ ...draft, reason: event.target.value })} />
                </div>
                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" disabled={run.isPending} onClick={() => setDraft(null)}>رجوع</Button>
                  <Button type="submit" variant="destructive" disabled={run.isPending || !isEligible || !capabilities.data?.configured ||
                    draft.reason.trim().length < 3 || (draft.kind === 'refund' && (validateAmount <= 0 || validateAmount > remaining))}>
                    تأكيد الإرسال إلى Paymob
                  </Button>
                </DialogFooter>
              </form>
            )}

            {pending && capabilities.data?.configured && (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm">تحقق من نتيجة الإجراء قبل إرسال إجراء جديد.</p>
                {!pending.provider_action_id && (
                  <>
                    <Label htmlFor="paymob-operation-id">رقم عملية الفويد أو الريفند من Paymob</Label>
                    <Input id="paymob-operation-id" dir="ltr" inputMode="numeric" maxLength={20}
                      value={lookupId} onChange={(event) => setLookupId(event.target.value)} />
                  </>
                )}
                <Button size="sm" variant="outline" disabled={run.isPending || (!pending.provider_action_id && !/^[1-9]\d{0,19}$/.test(lookupId))}
                  onClick={() => run.mutate({ command: 'check', request_id: pending.id, provider_action_id: lookupId })}>
                  تحقق من الحالة
                </Button>
              </div>
            )}

            <h3 className="font-semibold">سجل الإجراءات</h3>
            {payment.actions.length === 0 && <p className="text-sm text-muted-foreground">لا توجد إجراءات مسجلة.</p>}
            {payment.actions.map((action) => (
              <div key={action.id} className="space-y-1 border-t pt-2 text-sm">
                <p>{actionNames[action.kind]} · {money.format(action.amount_cents / 100)} {payment.currency} · {actionStates[action.status]}</p>
                <p className="text-muted-foreground"><bdi data-no-translate>{action.requested_by || '—'}</bdi> · {date.format(new Date(action.created_at))}</p>
                <p className="break-words">{action.reason}</p>
                {action.provider_action_id && <p>رقم إجراء Paymob <bdi>{action.provider_action_id}</bdi></p>}
              </div>
            ))}
          </DialogContent>
        )}
      </Dialog>
    </Card>
  );
}
