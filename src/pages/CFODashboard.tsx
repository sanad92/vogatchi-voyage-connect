import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  useIncomeStatement,
  useBalanceSheet,
  useCashFlow,
  useCustomerAging,
  useTrialBalance,
} from '@/hooks/useFinancialReports';
import {
  TrendingUp, TrendingDown, Wallet, Users, Scale, Activity, AlertCircle,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

const fmt = (n: number) =>
  new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(n || 0);

const today = new Date();
const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
const todayStr = today.toISOString().slice(0, 10);

const CFODashboard = () => {
  const [start, setStart] = useState(firstOfMonth);
  const [end, setEnd] = useState(todayStr);

  const income = useIncomeStatement(start, end);
  const balance = useBalanceSheet(end);
  const cash = useCashFlow(start, end);
  const aging = useCustomerAging();
  const trial = useTrialBalance(end);

  const kpis = useMemo(() => {
    const rows = income.data || [];
    const revenue = rows.filter(r => r.account_type === 'revenue').reduce((s, r) => s + Number(r.amount), 0);
    const expense = rows.filter(r => r.account_type === 'expense').reduce((s, r) => s + Number(r.amount), 0);
    const net = revenue - expense;
    const margin = revenue > 0 ? (net / revenue) * 100 : 0;

    const bs = balance.data || [];
    const assets = bs.filter(r => r.account_type === 'asset').reduce((s, r) => s + Number(r.balance), 0);
    const liabilities = bs.filter(r => r.account_type === 'liability').reduce((s, r) => s + Number(r.balance), 0);
    const equity = bs.filter(r => r.account_type === 'equity').reduce((s, r) => s + Number(r.balance), 0);

    const flows = cash.data || [];
    const inflow = flows.reduce((s, r) => s + Number(r.inflows), 0);
    const outflow = flows.reduce((s, r) => s + Number(r.outflows), 0);
    const netCash = inflow - outflow;

    const ag = aging.data || [];
    const totalDue = ag.reduce((s, r) => s + Number(r.total_due), 0);
    const overdue = ag.reduce((s, r) => s + Number(r.days_30) + Number(r.days_60) + Number(r.days_90) + Number(r.days_over_90), 0);

    return { revenue, expense, net, margin, assets, liabilities, equity, inflow, outflow, netCash, totalDue, overdue };
  }, [income.data, balance.data, cash.data, aging.data]);

  const chartData = (cash.data || []).map(r => ({
    date: r.period_date.slice(5),
    inflow: Number(r.inflows),
    outflow: Number(r.outflows),
    net: Number(r.net_flow),
  }));

  return (
    <div className="space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">لوحة المدير المالي (CFO)</h1>
          <p className="text-muted-foreground text-sm mt-1">
            مصدر الحقيقة الرسمي — مبني على القيود المحاسبية المرحّلة
          </p>
        </div>
        <Badge variant="outline" className="gap-1">
          <Activity className="h-3 w-3" /> Real-time من المحرك المحاسبي
        </Badge>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-xs">
          الأرقام مستمدة من الجداول التشغيلية (فواتير، حجوزات، مدفوعات موردين، مصروفات، حسابات بنكية) عبر دوال RPC مخصّصة. جميع القيم بالجنيه المصري (EGP) ما لم يُذكر خلاف ذلك. للحصول على تفصيل لكل عملة، راجع <a href="/executive-finance" className="underline font-medium">اللوحة التنفيذية</a>.
        </AlertDescription>
      </Alert>

      <Card>
        <CardContent className="pt-6 flex gap-4 items-end flex-wrap">
          <div className="space-y-1">
            <Label>من تاريخ</Label>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>إلى تاريخ</Label>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI title="الإيرادات" value={fmt(kpis.revenue)} icon={<TrendingUp className="h-5 w-5" />} positive />
        <KPI title="المصروفات" value={fmt(kpis.expense)} icon={<TrendingDown className="h-5 w-5" />} negative />
        <KPI
          title="صافي الربح"
          value={fmt(kpis.net)}
          subtitle={`هامش ${kpis.margin.toFixed(1)}%`}
          icon={<Wallet className="h-5 w-5" />}
          positive={kpis.net >= 0}
          negative={kpis.net < 0}
        />
        <KPI title="صافي التدفق النقدي" value={fmt(kpis.netCash)} icon={<Activity className="h-5 w-5" />} positive={kpis.netCash >= 0} negative={kpis.netCash < 0} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI title="الأصول" value={fmt(kpis.assets)} icon={<Scale className="h-5 w-5" />} />
        <KPI title="الخصوم" value={fmt(kpis.liabilities)} icon={<Scale className="h-5 w-5" />} />
        <KPI title="حقوق الملكية" value={fmt(kpis.equity)} icon={<Scale className="h-5 w-5" />} />
      </div>

      {/* Cash flow chart */}
      <Card>
        <CardHeader>
          <CardTitle>التدفق النقدي اليومي</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              لا توجد حركات نقدية في هذه الفترة
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Area type="monotone" dataKey="inflow" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.3)" name="داخل" />
                <Area type="monotone" dataKey="outflow" stackId="2" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive) / 0.3)" name="خارج" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Aging summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> ذمم العملاء
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <AgingCell label="الإجمالي" value={kpis.totalDue} />
            <AgingCell label="حالي" value={(aging.data || []).reduce((s, r) => s + Number(r.current_due), 0)} />
            <AgingCell label="1-30 يوم" value={(aging.data || []).reduce((s, r) => s + Number(r.days_30), 0)} warn />
            <AgingCell label="31-60 يوم" value={(aging.data || []).reduce((s, r) => s + Number(r.days_60), 0)} warn />
            <AgingCell label="+60 يوم" value={(aging.data || []).reduce((s, r) => s + Number(r.days_90) + Number(r.days_over_90), 0)} danger />
          </div>
          {kpis.overdue > 0 && (
            <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              <AlertCircle className="h-4 w-4" />
              متأخرات بقيمة {fmt(kpis.overdue)} تتطلب متابعة فورية
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trial balance summary */}
      <Card>
        <CardHeader>
          <CardTitle>ميزان المراجعة المختصر ({(trial.data || []).length} حساب)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground">
                  <th className="text-right py-2">الحساب</th>
                  <th className="text-right py-2">النوع</th>
                  <th className="text-left py-2">مدين</th>
                  <th className="text-left py-2">دائن</th>
                  <th className="text-left py-2">الرصيد</th>
                </tr>
              </thead>
              <tbody>
                {(trial.data || []).slice(0, 10).map(r => (
                  <tr key={r.account_id} className="border-b">
                    <td className="py-2">{r.account_name_ar || r.account_name}</td>
                    <td><Badge variant="outline">{r.account_type}</Badge></td>
                    <td className="text-left">{fmt(Number(r.total_debit))}</td>
                    <td className="text-left">{fmt(Number(r.total_credit))}</td>
                    <td className="text-left font-semibold">{fmt(Number(r.balance))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const KPI = ({
  title, value, subtitle, icon, positive, negative,
}: {
  title: string; value: string; subtitle?: string; icon: React.ReactNode; positive?: boolean; negative?: boolean;
}) => (
  <Card className={positive ? 'border-primary/30' : negative ? 'border-destructive/30' : ''}>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className={`text-2xl font-bold mt-1 ${negative ? 'text-destructive' : positive ? 'text-primary' : ''}`}>{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={`p-2 rounded-md ${negative ? 'bg-destructive/10 text-destructive' : positive ? 'bg-primary/10 text-primary' : 'bg-muted'}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const AgingCell = ({ label, value, warn, danger }: { label: string; value: number; warn?: boolean; danger?: boolean }) => (
  <div className={`p-3 rounded-md border ${danger ? 'border-destructive/30 bg-destructive/5' : warn ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border'}`}>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className={`text-lg font-bold mt-1 ${danger ? 'text-destructive' : ''}`}>{fmt(value)}</p>
  </div>
);

export default CFODashboard;
