import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Loader2 } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { usePlatformAdmin } from '@/hooks/usePlatformAdmin';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const statuses = {
  new: 'جديد',
  contacted: 'تم التواصل',
  closed: 'مغلق',
} as const;

type Status = keyof typeof statuses;
type StatusFilter = 'all' | Status;
type Inquiry = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  message: string;
  status: Status;
  created_at: string;
  updated_at: string;
};

type RpcError = { code?: string };
type RpcResult<T> = { data: T | null; error: RpcError | null };
type InquiryFunctions = {
  (name: 'list_platform_custom_plan_inquiries', args: { _status: Status | null; _offset: number }): {
    abortSignal(signal: AbortSignal): PromiseLike<RpcResult<Inquiry[]>>;
  };
  (name: 'update_platform_custom_plan_inquiry_status', args: {
    _id: string; _status: Status; _expected_status: Status;
  }): PromiseLike<RpcResult<Pick<Inquiry, 'id' | 'status' | 'updated_at'>>>;
};
const inquiryRpc = supabase.rpc.bind(supabase) as unknown as InquiryFunctions;
const pageSize = 50;
const queryScope = 'platform-custom-plan-inquiries';

function errorCode(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
}

function InquiryCard({ inquiry, userId, formatDate }: { inquiry: Inquiry; userId: string; formatDate: (value: string) => string }) {
  const { dir } = useLanguage();
  const queryClient = useQueryClient();
  const [selection, setSelection] = useState<{ from: Status; next: Status } | null>(null);
  const nextStatus = selection?.from === inquiry.status ? selection.next : inquiry.status;
  const statusLabel = statuses[inquiry.status];
  const statusInput = `custom-plan-status-${inquiry.id}`;

  const save = useMutation({
    mutationFn: async () => {
      const { data, error } = await inquiryRpc('update_platform_custom_plan_inquiry_status', {
        _id: inquiry.id,
        _status: nextStatus,
        _expected_status: inquiry.status,
      });
      if (error) throw error;
      if (!data || data.id !== inquiry.id || data.status !== nextStatus) throw new Error('Status not saved');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [queryScope, userId] });
      setSelection(null);
    },
    onError: async (error) => {
      if (errorCode(error) === '40001') {
        setSelection(null);
        await queryClient.invalidateQueries({ queryKey: [queryScope, userId] });
      }
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!save.isPending && nextStatus !== inquiry.status) save.mutate();
  }

  return (
    <Card>
      <CardHeader className="gap-2 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="break-words text-base" dir="auto" data-no-translate>{inquiry.company_name}</CardTitle>
          <Badge variant={inquiry.status === 'new' ? 'default' : 'secondary'}>{statusLabel}</Badge>
        </div>
        <CardDescription>
          استُلم الطلب في <time dateTime={inquiry.created_at}>{formatDate(inquiry.created_at)}</time>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div className="min-w-0">
            <dt className="text-muted-foreground">جهة الاتصال</dt>
            <dd className="mt-1 break-words font-medium" dir="auto" data-no-translate>{inquiry.contact_name}</dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">البريد الإلكتروني</dt>
            <dd className="mt-1 break-all"><bdi data-no-translate>{inquiry.email}</bdi></dd>
          </div>
          <div className="min-w-0">
            <dt className="text-muted-foreground">الهاتف</dt>
            <dd className="mt-1 break-all"><bdi data-no-translate>{inquiry.phone || '—'}</bdi></dd>
          </div>
          {inquiry.message && (
            <div className="min-w-0 sm:col-span-2 lg:col-span-3">
              <dt className="text-muted-foreground">متطلبات الباقة</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words" dir="auto" data-no-translate>{inquiry.message}</dd>
            </div>
          )}
        </dl>
        <form onSubmit={submit} className="space-y-2 border-t border-border pt-4">
          <Label htmlFor={statusInput}>حالة المتابعة</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select dir={dir} value={nextStatus} disabled={save.isPending} onValueChange={(value: Status) => {
              save.reset();
              setSelection({ from: inquiry.status, next: value });
            }}>
              <SelectTrigger id={statusInput} className="w-full sm:w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(statuses).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" disabled={save.isPending || nextStatus === inquiry.status}>
              {save.isPending ? 'جارٍ حفظ الحالة…' : 'حفظ الحالة'}
            </Button>
          </div>
          {save.isSuccess && <p role="status" className="text-sm text-muted-foreground">تم حفظ حالة المتابعة.</p>}
          {save.isError && (
            <p role="alert" className="text-sm text-destructive">
              {errorCode(save.error) === '40001' ? 'حالة الطلب اتغيّرت. راجع الحالة الحالية وحاول تاني.'
                : errorCode(save.error) === '42501' ? 'حسابك لا يملك صلاحية تحديث الطلب.'
                  : 'تعذّر حفظ الحالة. حاول مرة تانية.'}
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

export default function PlatformCustomPlanInquiries() {
  const { user } = useOptimizedAuth();
  const { platformRole, loading: roleLoading } = usePlatformAdmin();
  const { language, dir } = useLanguage();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(0);
  const userId = user?.id;
  const canManage = platformRole === 'platform_owner' || platformRole === 'platform_admin';

  const inquiries = useQuery({
    queryKey: [queryScope, userId, filter, page],
    enabled: Boolean(userId && canManage && !roleLoading),
    retry: false,
    gcTime: 0,
    queryFn: async ({ signal }) => {
      const { data, error } = await inquiryRpc('list_platform_custom_plan_inquiries', {
        _status: filter === 'all' ? null : filter,
        _offset: page * pageSize,
      }).abortSignal(signal);
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = inquiries.data?.slice(0, pageSize) ?? [];
  const hasNextPage = (inquiries.data?.length ?? 0) > pageSize;
  const dates = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'ar-EG', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo',
  });
  const formatDate = (value: string) => Number.isFinite(Date.parse(value)) ? dates.format(new Date(value)) : '—';

  return (
    <section className="space-y-5" dir={dir}>
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ClipboardList aria-hidden="true" className="size-6 text-primary" />
          طلبات الباقات المخصصة
        </h1>
        <p className="mt-1 text-muted-foreground">راجع طلبات الشركات وحدّث حالة متابعتها.</p>
      </header>

      {roleLoading ? (
        <p role="status" className="text-sm text-muted-foreground">جارٍ التحقق من الصلاحيات…</p>
      ) : !userId || !canManage ? (
        <p role="alert" className="text-sm text-destructive">حسابك لا يملك صلاحية عرض الطلبات.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="custom-plan-status-filter">حالة الطلب</Label>
              <Select value={filter} dir={dir} onValueChange={(value: StatusFilter) => { setFilter(value); setPage(0); }}>
                <SelectTrigger id="custom-plan-status-filter" className="w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  {Object.entries(statuses).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" variant="outline" disabled={inquiries.isFetching} onClick={() => void inquiries.refetch()}>
              تحديث الطلبات
            </Button>
          </div>

          <div aria-busy={inquiries.isFetching} className="space-y-3">
            {inquiries.isPending ? (
              <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 aria-hidden="true" className="size-4 animate-spin" /> جارٍ تحميل الطلبات…
              </p>
            ) : inquiries.isError ? (
              <p role="alert" className="text-sm text-destructive">
                {errorCode(inquiries.error) === '42501' ? 'حسابك لا يملك صلاحية عرض الطلبات.' : 'تعذّر تحميل الطلبات. حدّث القائمة وحاول تاني.'}
              </p>
            ) : rows.length === 0 ? (
              <Card><CardContent className="py-5 text-sm text-muted-foreground">
                {page > 0 ? 'لا توجد طلبات في الصفحة دي. ارجع للصفحة السابقة.'
                  : filter === 'all' ? 'لسه مفيش طلبات باقات مخصصة.' : 'مفيش طلبات في الحالة دي.'}
              </CardContent></Card>
            ) : (
              rows.map(inquiry => <InquiryCard key={inquiry.id} inquiry={inquiry} userId={userId} formatDate={formatDate} />)
            )}
          </div>

          {(page > 0 || hasNextPage) && (
            <nav aria-label="صفحات الطلبات" className="flex items-center gap-2">
              <Button type="button" variant="outline" disabled={page === 0 || inquiries.isFetching}
                onClick={() => setPage(current => Math.max(0, current - 1))}>السابق</Button>
              <span className="text-sm text-muted-foreground">صفحة {page + 1}</span>
              <Button type="button" variant="outline" disabled={!hasNextPage || inquiries.isFetching}
                onClick={() => setPage(current => current + 1)}>التالي</Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
