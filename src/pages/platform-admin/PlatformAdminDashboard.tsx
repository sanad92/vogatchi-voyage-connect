import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users, CreditCard, AlertTriangle, Clock, TrendingUp, TrendingDown, BanknoteIcon, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const PlatformAdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['platform-admin-stats'],
    queryFn: async () => {
      const [orgs, members, subs, transfers] = await Promise.all([
        supabase.from('organizations').select('id, is_active, created_at'),
        supabase.from('organization_members').select('id'),
        supabase.from('subscriptions').select('id, status, plan_id, expires_at'),
        supabase.from('bank_transfer_requests').select('id, status'),
      ]);
      return {
        totalOrgs: orgs.data?.length ?? 0,
        activeOrgs: orgs.data?.filter(o => o.is_active).length ?? 0,
        totalUsers: members.data?.length ?? 0,
        activeSubs: subs.data?.filter(s => s.status === 'active').length ?? 0,
        trialSubs: subs.data?.filter(s => s.status === 'trialing').length ?? 0,
        expiredSubs: subs.data?.filter(s => s.status === 'expired' || s.status === 'cancelled').length ?? 0,
        pendingTransfers: transfers.data?.filter(t => t.status === 'pending').length ?? 0,
        expiringSoon: subs.data?.filter(s => {
          if (!s.expires_at || s.status !== 'active') return false;
          const d = new Date(s.expires_at);
          const now = new Date();
          const diff = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
          return diff > 0 && diff <= 7;
        }).length ?? 0,
      };
    },
    staleTime: 60_000,
  });

  const { data: planDistribution } = useQuery({
    queryKey: ['platform-plan-distribution'],
    queryFn: async () => {
      const { data: subs } = await supabase.from('subscriptions').select('plan_id, status, subscription_plans(name)').in('status', ['active', 'trialing']);
      const counts: Record<string, number> = {};
      subs?.forEach((s: any) => {
        const name = s.subscription_plans?.name || 'غير محدد';
        counts[name] = (counts[name] || 0) + 1;
      });
      return Object.entries(counts).map(([name, value]) => ({ name, value }));
    },
    staleTime: 120_000,
  });

  const { data: monthlyGrowth } = useQuery({
    queryKey: ['platform-monthly-growth'],
    queryFn: async () => {
      const { data: orgs } = await supabase.from('organizations').select('created_at');
      const months: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months[key] = 0;
      }
      orgs?.forEach(o => {
        const d = new Date(o.created_at!);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key in months) months[key]++;
      });
      const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
      return Object.entries(months).map(([key, count]) => ({
        month: monthNames[parseInt(key.split('-')[1]) - 1],
        count,
      }));
    },
    staleTime: 120_000,
  });

  const cards = [
    { label: 'إجمالي المؤسسات', value: stats?.totalOrgs ?? 0, icon: Building2, color: 'bg-primary/10 text-primary' },
    { label: 'مؤسسات نشطة', value: stats?.activeOrgs ?? 0, icon: Building2, color: 'bg-emerald-500/10 text-emerald-600' },
    { label: 'إجمالي المستخدمين', value: stats?.totalUsers ?? 0, icon: Users, color: 'bg-blue-500/10 text-blue-600' },
    { label: 'اشتراكات نشطة', value: stats?.activeSubs ?? 0, icon: CreditCard, color: 'bg-amber-500/10 text-amber-600' },
  ];

  const alerts = [
    stats?.pendingTransfers && stats.pendingTransfers > 0 && { icon: Clock, text: `${stats.pendingTransfers} تحويل بنكي بانتظار المراجعة`, variant: 'outline' as const },
    stats?.expiringSoon && stats.expiringSoon > 0 && { icon: AlertTriangle, text: `${stats.expiringSoon} اشتراك ينتهي خلال 7 أيام`, variant: 'destructive' as const },
    stats?.trialSubs && stats.trialSubs > 0 && { icon: Clock, text: `${stats.trialSubs} مؤسسة في الفترة التجريبية`, variant: 'secondary' as const },
  ].filter(Boolean) as { icon: any; text: string; variant: 'outline' | 'destructive' | 'secondary' }[];

  return (
    <div className="p-4 lg:p-6 space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">نظرة عامة على المنصة</h2>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map((a, i) => (
            <Badge key={i} variant={a.variant} className="gap-1.5 py-1.5 px-3 text-sm">
              <a.icon className="h-3.5 w-3.5" />
              {a.text}
            </Badge>
          ))}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <p className="text-3xl font-bold">{c.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${c.color}`}>
                  <c.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">نمو المؤسسات (آخر 6 أشهر)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthlyGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis allowDecimals={false} className="text-xs" />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="مؤسسات جديدة" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">توزيع خطط الاشتراك</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={planDistribution || []} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                  {(planDistribution || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Status Summary */}
      <Card>
        <CardHeader><CardTitle className="text-base">ملخص حالات الاشتراك</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-emerald-500/10">
              <p className="text-2xl font-bold text-emerald-600">{stats?.activeSubs ?? 0}</p>
              <p className="text-sm text-muted-foreground">نشط</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-500/10">
              <p className="text-2xl font-bold text-blue-600">{stats?.trialSubs ?? 0}</p>
              <p className="text-sm text-muted-foreground">تجريبي</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-amber-500/10">
              <p className="text-2xl font-bold text-amber-600">{stats?.expiringSoon ?? 0}</p>
              <p className="text-sm text-muted-foreground">ينتهي قريباً</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-500/10">
              <p className="text-2xl font-bold text-red-600">{stats?.expiredSubs ?? 0}</p>
              <p className="text-sm text-muted-foreground">منتهي</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlatformAdminDashboard;
