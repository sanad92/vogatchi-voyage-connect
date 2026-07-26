import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useBusinessHealth } from '@/hooks/useBusinessHealth';
import { TrendingUp, Wallet, HandCoins, Users, Percent, Target } from 'lucide-react';

const money = (n: number) => new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 0 }).format(n || 0);

const BusinessHealth = () => {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const { data, isLoading, refetch } = useBusinessHealth(from, to);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">مؤشرات صحة الأعمال</h1>
        <p className="text-sm text-muted-foreground">تحويل، ربحية، ذمم مدينة ودائنة، وأفضل استشاري</p>
      </div>

      <Card>
        <CardContent className="pt-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">من</label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">إلى</label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <Button size="sm" onClick={() => refetch()}>تطبيق</Button>
        </CardContent>
      </Card>

      {isLoading || !data ? (
        <p className="text-muted-foreground text-center py-16">جاري التحميل…</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Kpi label="فرص" value={data.leads} icon={Users} />
          <Kpi label="محوّلة" value={data.won} icon={Target} />
          <Kpi label="معدل التحويل" value={`${data.conversion_pct}%`} icon={Percent} />
          <Kpi label="هامش الربح" value={`${data.margin_pct}%`} icon={Percent} />
          <Kpi label="الإيرادات" value={money(data.revenue)} icon={TrendingUp} />
          <Kpi label="التكاليف" value={money(data.cost)} icon={Wallet} />
          <Kpi label="الأرباح" value={money(data.profit)} icon={TrendingUp} />
          <Kpi label="أفضل استشاري" value={data.top_consultant?.name ?? '—'} icon={Users} />
          <Kpi label="ذمم مدينة" value={money(data.receivables)} icon={Wallet} />
          <Kpi label="ذمم دائنة" value={money(data.payables)} icon={HandCoins} />
        </div>
      )}
    </div>
  );
};

const Kpi = ({ label, value, icon: Icon }: { label: string; value: string | number; icon: React.ComponentType<{ className?: string }> }) => (
  <Card>
    <CardContent className="pt-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default BusinessHealth;
