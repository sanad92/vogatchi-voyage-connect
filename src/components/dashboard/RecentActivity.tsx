import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, MessageSquare, Clock, ArrowUpLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const RecentActivity = () => {
  const orgId = useOrgId();

  const { data: recentBookings } = useQuery({
    queryKey: ['recent-bookings', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('hotel_bookings')
        .select('id, customer_name, hotel_name, total_cost_customer, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: recentCustomers } = useQuery({
    queryKey: ['recent-customers', orgId],
    queryFn: async () => {
      const { data } = await supabase
        .from('customers')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(2);
      return data || [];
    },
    enabled: !!orgId,
  });

  const activities = [
    ...(recentBookings || []).map(b => ({
      id: `b-${b.id}`,
      title: 'حجز جديد',
      desc: `${b.hotel_name} - ${b.customer_name}`,
      time: b.created_at,
      icon: Calendar,
      color: 'bg-primary/10 text-primary',
    })),
    ...(recentCustomers || []).map(c => ({
      id: `c-${c.id}`,
      title: 'عميل جديد',
      desc: c.name,
      time: c.created_at,
      icon: Users,
      color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
    })),
  ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);

  return (
    <Card className="shadow-md border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-muted">
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          النشاط الأخير
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {activities.length > 0 ? (
            activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className={cn("p-2 rounded-lg flex-shrink-0", activity.color)}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.desc}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground flex-shrink-0">
                    {formatDistanceToNow(new Date(activity.time), { addSuffix: true, locale: ar })}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">لا توجد أنشطة حديثة</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
