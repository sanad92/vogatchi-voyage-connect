import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Plane, PlaneLanding, CalendarClock, Wallet, HandCoins, ClipboardList,
  ClipboardCheck, AlertOctagon, MessageSquareWarning, RefreshCcw, Sparkles, TrendingUp,
} from 'lucide-react';
import { useOpsCommandCenter } from '@/hooks/useOpsCommandCenter';

const money = (n: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(n || 0);

interface KpiProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  to?: string;
  tone?: 'default' | 'warn' | 'danger' | 'success';
}
const KPI = ({ label, value, icon: Icon, to, tone = 'default' }: KpiProps) => {
  const toneClass = {
    default: 'text-primary',
    warn: 'text-amber-600',
    danger: 'text-destructive',
    success: 'text-emerald-600',
  }[tone];
  const inner = (
    <Card className="hover:shadow-md transition-all h-full">
      <CardContent className="pt-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
          <Icon className={`h-5 w-5 ${toneClass}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

const OperationsCommandCenter = () => {
  const { data, isLoading, refetch, isFetching } = useOpsCommandCenter();

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">مركز قيادة العمليات</h1>
          <p className="text-sm text-muted-foreground">لمحة شاملة لعمليات اليوم — مباشرة من محرك الأحداث</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCcw className="h-4 w-4 ml-1" /> تحديث
          </Button>
          <Link to="/operations/queue">
            <Button size="sm">
              <ClipboardList className="h-4 w-4 ml-1" /> قائمة المهام اليومية
            </Button>
          </Link>
        </div>
      </div>

      {isLoading || !data ? (
        <p className="text-muted-foreground text-center py-16">جاري تحميل بيانات العمليات…</p>
      ) : (
        <>
          {/* Today */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">اليوم</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="وصول اليوم" value={data.arrivals_today} icon={PlaneLanding} to="/bookings" />
              <KPI label="مغادرة اليوم" value={data.departures_today} icon={Plane} to="/bookings" />
              <KPI label="وصول خلال 7 أيام" value={data.checkins_next_7} icon={CalendarClock} to="/bookings" />
              <KPI label="مهام اليوم" value={data.today_tasks} icon={ClipboardList} to="/operations/queue" />
            </div>
          </section>

          {/* Money */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">المالية</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="مستحقات على العملاء" value={money(data.pending_customer_payments)} icon={Wallet} to="/invoices" tone="warn" />
              <KPI label="أوامر دفع للموردين" value={data.pending_supplier_pos} icon={HandCoins} to="/finance-approvals" tone="warn" />
              <KPI label="طلبات استرداد للاعتماد" value={data.refund_approvals} icon={ClipboardCheck} to="/finance-approvals" />
              <KPI label="إيرادات اليوم" value={money(data.revenue_today)} icon={TrendingUp} to="/reports/business-health" tone="success" />
            </div>
          </section>

          {/* Ops health */}
          <section>
            <h2 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">صحة العمليات</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI label="مهام متأخرة" value={data.overdue_tasks} icon={AlertOctagon} to="/operations/queue" tone="danger" />
              <KPI label="فشل رسائل واتساب (24س)" value={data.whatsapp_failures_24h} icon={MessageSquareWarning} to="/whatsapp-admin" tone="danger" />
              <KPI label="أحداث فاشلة" value={data.failed_events} icon={Sparkles} to="/platform/event-bus" tone="danger" />
              <KPI label="ربح مبدئي اليوم" value={money(data.profit_today)} icon={TrendingUp} to="/reports/business-health" tone="success" />
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">اختصارات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Link to="/bookings"><Button size="sm" variant="outline">الحجوزات</Button></Link>
              <Link to="/invoices"><Button size="sm" variant="outline">الفواتير</Button></Link>
              <Link to="/finance-approvals"><Button size="sm" variant="outline">اعتمادات المالية</Button></Link>
              <Link to="/whatsapp-inbox"><Button size="sm" variant="outline">واتساب</Button></Link>
              <Link to="/reports/business-health"><Button size="sm" variant="outline">مؤشرات الصحة</Button></Link>
              <Link to="/platform/event-bus"><Button size="sm" variant="outline">Event Bus</Button></Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default OperationsCommandCenter;
