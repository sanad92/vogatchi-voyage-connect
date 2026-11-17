import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Plane, PlaneLanding, CalendarClock, Wallet, HandCoins, ClipboardList,
  ClipboardCheck, AlertOctagon, MessageSquareWarning, RefreshCcw, TrendingUp,
} from 'lucide-react';
import { useOpsCommandCenter, type CurrencyAmount } from '@/hooks/useOpsCommandCenter';

const formatAmount = ({ amount, currency }: CurrencyAmount) => {
  const code = currency.trim().toUpperCase();
  const options: Intl.NumberFormatOptions = /^[A-Z]{3}$/.test(code)
    ? { style: 'currency', currency: code, currencyDisplay: 'code' }
    : { maximumFractionDigits: 2 };
  const formatted = new Intl.NumberFormat('ar-EG', options).format(amount);
  return options.currency ? formatted : `${formatted} ${currency}`;
};

interface MetricProps {
  label: string;
  value: number | CurrencyAmount[];
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  alert?: boolean;
}

function Metric({ label, value, icon: Icon, to, alert }: MetricProps) {
  const inner = <Card className="h-full">
    <CardContent className="flex items-start gap-3 p-4">
      <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${alert ? 'text-destructive' : 'text-primary'}`} />
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        {Array.isArray(value) ? (
          value.length > 0 ? <ul className="mt-1 space-y-0.5 text-base font-semibold">
            {value.map(amount => <li key={amount.currency} dir="ltr" className="text-right tabular-nums">{formatAmount(amount)}</li>)}
          </ul> : <p className="mt-1 text-lg font-semibold">٠</p>
        ) : <p className="mt-1 text-xl font-semibold tabular-nums">{value.toLocaleString('ar-EG')}</p>}
      </div>
    </CardContent>
  </Card>;
  return to ? <Link className="rounded-xl focus-visible:ring-2 focus-visible:ring-ring" to={to}>{inner}</Link> : inner;
}

const queue = (filter: string) => `/operations/queue?filter=${filter}`;

export default function OperationsCommandCenter() {
  const { data, isPending, isError, refetch, isFetching, dataUpdatedAt } = useOpsCommandCenter();

  return <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-6" dir="rtl">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">مركز قيادة العمليات</h1>
        {data && <p className="mt-1 text-sm text-muted-foreground">
          {new Intl.DateTimeFormat('ar-EG', { dateStyle: 'full', timeZone: 'UTC' }).format(new Date(`${data.date}T12:00:00Z`))}
          {dataUpdatedAt > 0 && <> · آخر تحديث {new Intl.DateTimeFormat('ar-EG', {
            hour: 'numeric', minute: 'numeric', timeZone: data.timezone,
          }).format(dataUpdatedAt)}</>}
        </p>}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
          <RefreshCcw className={`ms-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />{isFetching ? 'جارٍ التحديث…' : 'تحديث'}
        </Button>
        <Button asChild size="sm"><Link to="/operations/queue"><ClipboardList className="ms-2 h-4 w-4" />قائمة المهام اليومية</Link></Button>
      </div>
    </header>

    {isError && <Card className="flex flex-wrap items-center gap-3 p-4" role="alert">
      <span>{data ? 'تعذر تحديث البيانات. المعروض من آخر تحديث ناجح.' : 'تعذر تحميل بيانات العمليات.'}</span>
      <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching}>إعادة المحاولة</Button>
    </Card>}
    {isPending && <p className="py-12 text-center text-sm text-muted-foreground" role="status">جارٍ تحميل عمليات اليوم…</p>}
    {data && <>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">الحجوزات اليوم</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Metric label="حجوزات تبدأ اليوم" value={data.arrivals_today} icon={PlaneLanding} to="/travel-calendar" />
          <Metric label="حجوزات تنتهي اليوم" value={data.departures_today} icon={Plane} to="/travel-calendar" />
          <Metric label="حجوزات تبدأ خلال ٧ أيام" value={data.checkins_next_7} icon={CalendarClock} to="/travel-calendar" />
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">المهام والمتابعة</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="مهام مستحقة اليوم" value={data.today_tasks} icon={ClipboardList} to={queue('today')} />
          <Metric label="مهام متأخرة" value={data.overdue_tasks} icon={AlertOctagon} alert={data.overdue_tasks > 0} to={queue('overdue')} />
          <Metric label="طلبات فتح التعديل" value={data.edit_requests} icon={ClipboardCheck} to={queue('edit_requests')} />
          {data.failed_events !== null && <Metric label="أحداث بها أخطاء" value={data.failed_events} icon={AlertOctagon} alert={data.failed_events > 0} />}
          {data.whatsapp_failures_24h !== null && <Metric label="رسائل واتساب فشلت خلال ٢٤ ساعة" value={data.whatsapp_failures_24h}
            icon={MessageSquareWarning} alert={data.whatsapp_failures_24h > 0} to="/whatsapp-inbox" />}
        </div>
      </section>
      {data.finance && <section className="space-y-3">
        <h2 className="text-lg font-semibold">المالية</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Metric label="مبالغ متبقية على العملاء" value={data.finance.receivables} icon={Wallet} />
          <Metric label="تحصيلات اليوم" value={data.finance.receipts} icon={TrendingUp} />
          <Metric label="أوامر سداد الموردين المفتوحة" value={data.finance.pending_supplier_pos} icon={HandCoins} to="/finance-approvals" />
          <Metric label="طلبات استرداد تنتظر الاعتماد" value={data.finance.refund_approvals} icon={ClipboardCheck} to="/finance-approvals" />
        </div>
      </section>}
    </>}
  </div>;
}
