import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, ExternalLink, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOrgId } from '@/hooks/useOrgId';
import { opsQueuePageSize, useOpsQueue, useUpdateOpsTask, type QueueFilter, type TaskWaiting } from '@/hooks/useOpsCommandCenter';

const filters: { key: QueueFilter; label: string }[] = [
  { key: 'today', label: 'اليوم' },
  { key: 'overdue', label: 'المتأخرة' },
  { key: 'assigned_to_me', label: 'مهامي' },
  { key: 'edit_requests', label: 'طلبات فتح التعديل' },
  { key: 'waiting_customer', label: 'بانتظار العميل' },
  { key: 'waiting_supplier', label: 'بانتظار المورد' },
  { key: 'waiting_payment', label: 'بانتظار الدفع' },
  { key: 'completed_today', label: 'مكتملة اليوم' },
];
const waitingLabels = { customer: 'العميل', supplier: 'المورد', payment: 'الدفع' };
const statusLabels: Record<string, string> = { completed: 'مكتملة', pending: 'مفتوحة', open: 'مفتوحة', in_progress: 'قيد التنفيذ' };
const time = new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' });

export default function OperationsQueue() {
  const [params, setParams] = useSearchParams();
  const orgId = useOrgId();
  const filter = filters.find(option => option.key === params.get('filter'))?.key ?? 'today';
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filter, orgId]);
  const queue = useOpsQueue(filter, page);
  const update = useUpdateOpsTask();
  const rows = queue.data ?? [];
  const total = rows[0]?.total_count ?? 0;
  const change = async (id: string, action: 'complete' | 'waiting', waiting?: TaskWaiting | null) => {
    try {
      await update.mutateAsync({ id, action, waiting });
      toast.success(action === 'complete' ? 'تم إنجاز المهمة' : 'تم تحديث حالة الانتظار');
    } catch {
      toast.error('تعذر حفظ المهمة. حدّث القائمة وراجع صلاحيتك.');
    }
  };

  return <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6" dir="rtl">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-2">
        <Button asChild size="sm" variant="ghost"><Link to="/operations"><ArrowRight className="ms-1 h-4 w-4" />مركز قيادة العمليات</Link></Button>
        <h1 className="text-2xl font-bold">قائمة المهام اليومية</h1>
      </div>
      <Button variant="outline" size="sm" onClick={() => void queue.refetch()} disabled={queue.isFetching}>
        <RefreshCcw className={`ms-2 h-4 w-4 ${queue.isFetching ? 'animate-spin' : ''}`} />تحديث
      </Button>
    </header>
    <nav aria-label="تصفية المهام" className="flex flex-wrap gap-2">
      {filters.map(option => <Button key={option.key} size="sm" aria-pressed={filter === option.key}
        variant={filter === option.key ? 'default' : 'outline'}
        onClick={() => setParams({ filter: option.key }, { replace: true })}>{option.label}</Button>)}
    </nav>

    {queue.isError && <Card className="flex items-center gap-3 p-4" role="alert">
      <span>تعذر تحميل المهام.</span>
      <Button size="sm" variant="outline" onClick={() => void queue.refetch()}>إعادة المحاولة</Button>
    </Card>}
    {queue.isPending && <p className="py-10 text-center text-muted-foreground" role="status">جارٍ تحميل المهام…</p>}
    {queue.isSuccess && rows.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">
      {page === 1 ? 'لا توجد مهام في هذا القسم.' : <Button variant="outline" size="sm" onClick={() => setPage(page - 1)}>رجوع للصفحة السابقة</Button>}
    </Card>}
    {rows.map(task => <Card key={task.id}>
      <CardContent className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold">{task.title}</h2>
            <Badge variant={task.priority === 'urgent' ? 'destructive' : 'secondary'}>
              {task.kind === 'edit_request' ? 'بانتظار المدير' : task.waiting_on ? `بانتظار ${waitingLabels[task.waiting_on]}` : statusLabels[task.status] ?? 'مفتوحة'}
            </Badge>
          </div>
          <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {(task.completed_at || task.due_at) && <><Clock className="h-4 w-4" />{time.format(new Date(task.completed_at ?? task.due_at!))}</>}
            {task.booking_number && <span>{task.booking_number}</span>}
            {task.customer_name && <span>{task.customer_name}</span>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {task.booking_id && <Button asChild variant="outline" size="sm"><Link to={`/bookings/${task.booking_id}?tab=${task.kind === 'edit_request' ? 'amendments' : 'tasks'}`}>
            <ExternalLink className="ms-1 h-4 w-4" />{task.kind === 'edit_request' ? 'عرض الطلب' : 'فتح الحجز'}
          </Link></Button>}
          {task.can_act && <>
            <select className="h-9 rounded-md border bg-background px-2 text-sm" aria-label={`حالة انتظار ${task.title}`}
              value={task.waiting_on ?? ''} disabled={update.isPending}
              onChange={event => void change(task.id, 'waiting', (event.target.value || null) as TaskWaiting | null)}>
              <option value="">جاهزة للمتابعة</option>
              <option value="customer">بانتظار العميل</option>
              <option value="supplier">بانتظار المورد</option>
              <option value="payment">بانتظار الدفع</option>
            </select>
            <Button size="sm" disabled={update.isPending} onClick={() => void change(task.id, 'complete')}>
              <CheckCircle2 className="ms-1 h-4 w-4" />إنجاز
            </Button>
          </>}
        </div>
      </CardContent>
    </Card>)}
    {rows.length > 0 && (page > 1 || total > opsQueuePageSize) && <div className="flex items-center justify-center gap-3">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>السابق</Button>
      <span className="text-sm tabular-nums">{page} / {Math.ceil(total / opsQueuePageSize)}</span>
      <Button size="sm" variant="outline" disabled={page * opsQueuePageSize >= total} onClick={() => setPage(page + 1)}>التالي</Button>
    </div>}
  </div>;
}
