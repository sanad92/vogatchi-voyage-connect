import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Users, CreditCard } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PlatformAdminLayout from '@/components/platform-admin/PlatformAdminLayout';

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
    { label: 'إجمالي المؤسسات', value: stats?.totalOrgs ?? 0, icon: Building2, color: 'text-primary' },
    { label: 'مؤسسات نشطة', value: stats?.activeOrgs ?? 0, icon: Building2, color: 'text-green-500' },
    { label: 'إجمالي المستخدمين', value: stats?.totalUsers ?? 0, icon: Users, color: 'text-blue-500' },
    { label: 'اشتراكات نشطة', value: stats?.activeSubs ?? 0, icon: CreditCard, color: 'text-amber-500' },
  ];

  return (
    <PlatformAdminLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">نظرة عامة</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-foreground">{c.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </PlatformAdminLayout>
  );
};

export default PlatformAdminDashboard;
