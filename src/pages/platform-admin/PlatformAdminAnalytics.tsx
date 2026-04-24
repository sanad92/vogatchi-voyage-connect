import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Building2, CreditCard, DollarSign, Users, Activity } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts';

interface MonthlyStat {
  month: string;
  organizations: number;
  subscriptions: number;
  revenue: number;
}

interface PlanDistribution {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['hsl(var(--primary))', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6'];

const PlatformAdminAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStat[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
  const [statusDistribution, setStatusDistribution] = useState<PlanDistribution[]>([]);
  const [totals, setTotals] = useState({
    totalOrgs: 0,
    activeSubs: 0,
    trialingSubs: 0,
    expiredSubs: 0,
    totalRevenue: 0,
    avgRevenuePerOrg: 0,
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      // كل المؤسسات
      const { data: orgs } = await supabase
        .from('organizations')
        .select('id, created_at');

      // كل الاشتراكات + خططها
      const { data: subs } = await supabase
        .from('subscriptions')
        .select(`
          id, status, created_at, expires_at,
          subscription_plans!inner ( name, name_ar, price_monthly )
        `);

      // التحويلات البنكية المعتمدة (الإيرادات الفعلية)
      const { data: transfers } = await supabase
        .from('bank_transfers')
        .select('amount, status, created_at')
        .eq('status', 'approved');

      // ===== حسابات الإجماليات =====
      const totalOrgs = orgs?.length || 0;
      const activeSubs = subs?.filter(s => s.status === 'active').length || 0;
      const trialingSubs = subs?.filter(s => s.status === 'trialing').length || 0;
      const expiredSubs = subs?.filter(s => s.status === 'expired' || s.status === 'cancelled').length || 0;
      const totalRevenue = transfers?.reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;
      const avgRevenuePerOrg = totalOrgs > 0 ? totalRevenue / totalOrgs : 0;

      setTotals({ totalOrgs, activeSubs, trialingSubs, expiredSubs, totalRevenue, avgRevenuePerOrg });

      // ===== الإحصائيات الشهرية (آخر 6 شهور) =====
      const months: MonthlyStat[] = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const next = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
        const label = d.toLocaleDateString('ar-EG', { month: 'short', year: '2-digit' });

        const orgsInMonth = orgs?.filter(o => {
          const c = new Date(o.created_at);
          return c >= d && c < next;
        }).length || 0;

        const subsInMonth = subs?.filter(s => {
          const c = new Date(s.created_at);
          return c >= d && c < next;
        }).length || 0;

        const revInMonth = transfers?.filter(t => {
          const c = new Date(t.created_at);
          return c >= d && c < next;
        }).reduce((sum, t) => sum + Number(t.amount || 0), 0) || 0;

        months.push({
          month: label,
          organizations: orgsInMonth,
          subscriptions: subsInMonth,
          revenue: revInMonth,
        });
      }
      setMonthlyStats(months);

      // ===== توزيع الخطط =====
      const planMap = new Map<string, number>();
      subs?.forEach((s: any) => {
        const name = s.subscription_plans?.name_ar || s.subscription_plans?.name || 'بدون';
        planMap.set(name, (planMap.get(name) || 0) + 1);
      });
      setPlanDistribution(
        Array.from(planMap.entries()).map(([name, value], i) => ({
          name, value, color: COLORS[i % COLORS.length],
        }))
      );

      // ===== توزيع الحالات =====
      const statusLabels: Record<string, string> = {
        active: 'نشط', trialing: 'تجريبي', expired: 'منتهٍ',
        cancelled: 'ملغى', past_due: 'متأخر',
      };
      const statusMap = new Map<string, number>();
      subs?.forEach(s => {
        const label = statusLabels[s.status] || s.status;
        statusMap.set(label, (statusMap.get(label) || 0) + 1);
      });
      setStatusDistribution(
        Array.from(statusMap.entries()).map(([name, value], i) => ({
          name, value, color: COLORS[i % COLORS.length],
        }))
      );
    } catch (err) {
      console.error('فشل تحميل التحليلات:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  const fmt = (n: number) => new Intl.NumberFormat('ar-EG').format(Math.round(n));
  const fmtCurrency = (n: number) =>
    `${new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(n)} ج.م`;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-7 w-7 text-amber-600" />
          التحليلات والتقارير
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          نظرة شاملة على نمو المنصة، الاشتراكات، والإيرادات
        </p>
      </div>

      {/* بطاقات الإجماليات */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Building2} label="إجمالي المؤسسات" value={fmt(totals.totalOrgs)} color="text-blue-600" />
        <StatCard icon={CreditCard} label="اشتراكات نشطة" value={fmt(totals.activeSubs)} color="text-green-600" />
        <StatCard icon={Users} label="فترة تجريبية" value={fmt(totals.trialingSubs)} color="text-amber-600" />
        <StatCard icon={Activity} label="منتهية/ملغاة" value={fmt(totals.expiredSubs)} color="text-red-600" />
        <StatCard icon={DollarSign} label="إجمالي الإيرادات" value={fmtCurrency(totals.totalRevenue)} color="text-emerald-600" />
        <StatCard icon={TrendingUp} label="متوسط/مؤسسة" value={fmtCurrency(totals.avgRevenuePerOrg)} color="text-purple-600" />
      </div>

      {/* النمو الشهري */}
      <Card>
        <CardHeader>
          <CardTitle>النمو خلال آخر 6 شهور</CardTitle>
          <CardDescription>المؤسسات والاشتراكات الجديدة شهرياً</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="organizations" name="مؤسسات جديدة" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              <Area type="monotone" dataKey="subscriptions" name="اشتراكات جديدة" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* الإيرادات الشهرية */}
      <Card>
        <CardHeader>
          <CardTitle>الإيرادات الشهرية</CardTitle>
          <CardDescription>إجمالي التحويلات البنكية المعتمدة شهرياً (ج.م)</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v: number) => fmtCurrency(v)} />
              <Bar dataKey="revenue" name="الإيرادات" fill="#10b981" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* التوزيعات */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>توزيع الخطط</CardTitle>
            <CardDescription>عدد المؤسسات في كل خطة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={planDistribution}
                  cx="50%" cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={(e: any) => `${e.name}: ${e.value}`}
                >
                  {planDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>حالة الاشتراكات</CardTitle>
            <CardDescription>توزيع الاشتراكات حسب الحالة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%" cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={(e: any) => `${e.name}: ${e.value}`}
                >
                  {statusDistribution.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <p className={`text-xl md:text-2xl font-bold ${color}`}>{value}</p>
    </CardContent>
  </Card>
);

export default PlatformAdminAnalytics;
