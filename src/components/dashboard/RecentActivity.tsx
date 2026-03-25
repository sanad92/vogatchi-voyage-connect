import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Users, MessageSquare, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';

type Activity = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: typeof Calendar;
  color: string;
};

const formatActivityTime = (timestamp: string) =>
  new Date(timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });

const RecentActivity = () => {
  const orgId = useOrgId();

  const { data: recentBookings = [] } = useQuery({
    queryKey: ['recent-bookings', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_bookings')
        .select('id, customer_name, hotel_name, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: recentCustomers = [] } = useQuery({
    queryKey: ['recent-customers', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, created_at')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(2);

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const { data: recentFollowUps = [] } = useQuery({
    queryKey: ['recent-followups', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .select('id, completed_at, customers!inner(name)')
        .eq('organization_id', orgId)
        .eq('status', 'completed')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(2);

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const activities: Activity[] = [
    ...recentBookings.map((booking) => ({
      id: `booking-${booking.id}`,
      title: '\u062d\u062c\u0632 \u062c\u062f\u064a\u062f',
      description: `${booking.hotel_name || '-'} - ${booking.customer_name || '-'}`,
      timestamp: booking.created_at,
      icon: Calendar,
      color: 'bg-blue-100 text-blue-700',
    })),
    ...recentCustomers.map((customer) => ({
      id: `customer-${customer.id}`,
      title: '\u0639\u0645\u064a\u0644 \u062c\u062f\u064a\u062f',
      description: `\u062a\u0645 \u062a\u0633\u062c\u064a\u0644 ${customer.name || '-'}`,
      timestamp: customer.created_at,
      icon: Users,
      color: 'bg-green-100 text-green-700',
    })),
    ...recentFollowUps.map((followUp) => ({
      id: `followup-${followUp.id}`,
      title: '\u0645\u062a\u0627\u0628\u0639\u0629 \u0645\u0643\u062a\u0645\u0644\u0629',
      description: `\u062a\u0645 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0645\u0639 ${followUp.customers?.name || '-'}`,
      timestamp: followUp.completed_at,
      icon: MessageSquare,
      color: 'bg-orange-100 text-orange-700',
    })),
  ]
    .filter((activity) => Boolean(activity.timestamp))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <Clock className="h-5 w-5" />
          {'\u0622\u062e\u0631 \u0627\u0644\u0646\u0634\u0627\u0637\u0627\u062a'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.length > 0 ? (
            activities.map((activity) => {
              const Icon = activity.icon;

              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-2 sm:p-3 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <div className={`p-2 rounded-lg ${activity.color} flex-shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                      <span className="text-xs text-gray-500 flex-shrink-0">
                        {formatActivityTime(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{activity.description}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">{'\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u0646\u0634\u0637\u0629 \u062d\u062f\u064a\u062b\u0629'}</p>
              <p className="text-xs text-gray-400 mt-1">{'\u0633\u062a\u0638\u0647\u0631 \u0627\u0644\u0623\u0646\u0634\u0637\u0629 \u0627\u0644\u062c\u062f\u064a\u062f\u0629 \u0647\u0646\u0627'}</p>
            </div>
          )}
        </div>

        {activities.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              {'\u0622\u062e\u0631 \u062a\u062d\u062f\u064a\u062b'}: {new Date().toLocaleTimeString('ar-EG')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
