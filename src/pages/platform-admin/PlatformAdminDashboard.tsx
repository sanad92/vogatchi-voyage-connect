import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users, CreditCard, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const PlatformAdminDashboard = () => {
  const { data: stats } = useQuery({
    queryKey: ['platform-admin-stats'],
    queryFn: async () => {
      const [orgs, members, subs] = await Promise.all([
        supabase.from('organizations').select('id, is_active'),
        supabase.from('organization_members').select('id'),
        supabase.from('subscriptions').select('id, status'),
      ]);
      return {
        totalOrgs: orgs.data?.length ?? 0,
        activeOrgs: orgs.data?.filter(o => o.is_active).length ?? 0,
        totalUsers: members.data?.length ?? 0,
        activeSubs: subs.data?.filter(s => s.status === 'active').length ?? 0,
      };
    },
  });

  const cards = [
    { label: 'إجمالي المؤسسات', value: stats?.totalOrgs ?? 0, icon: Building2, color: 'bg-primary text-primary-foreground' },
    { label: 'مؤسسات نشطة', value: stats?.activeOrgs ?? 0, icon: Building2, color: 'bg-success text-success-foreground' },
    { label: 'إجمالي المستخدمين', value: stats?.totalUsers ?? 0, icon: Users, color: 'bg-info text-info-foreground' },
    { label: 'اشتراكات نشطة', value: stats?.activeSubs ?? 0, icon: CreditCard, color: 'bg-warning text-warning-foreground' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6" dir="rtl">
      <h2 className="text-2xl font-bold text-foreground">نظرة عامة على المنصة</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{c.label}</p>
                  <p className="text-3xl font-bold text-foreground">{c.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${c.color}`}>
                  <c.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PlatformAdminDashboard;
