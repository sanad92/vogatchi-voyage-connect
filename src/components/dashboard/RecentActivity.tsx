
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Receipt, MessageSquare, Clock } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const RecentActivity = () => {
  // جلب الأنشطة الحقيقية من قاعدة البيانات
  const { data: recentBookings } = useQuery({
    queryKey: ['recent-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_bookings')
        .select('id, customer_name, hotel_name, total_cost_customer, created_at')
        .order('created_at', { ascending: false })
        .limit(3);
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: recentCustomers } = useQuery({
    queryKey: ['recent-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(2);
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: recentFollowUps } = useQuery({
    queryKey: ['recent-followups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .select(`
          id, 
          status,
          completed_at,
          customers!inner(name)
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(2);
      
      if (error) throw error;
      return data || [];
    }
  });

  // تجميع الأنشطة من البيانات الحقيقية
  const generateActivities = () => {
    const activities = [];

    // إضافة الحجوزات الحديثة
    if (recentBookings) {
      recentBookings.forEach(booking => {
        activities.push({
          id: `booking-${booking.id}`,
          type: 'booking',
          title: 'حجز جديد',
          description: `${booking.hotel_name} - ${booking.customer_name}`,
          time: new Date(booking.created_at).toLocaleTimeString('ar-EG', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          icon: Calendar,
          color: 'bg-blue-100 text-blue-700'
        });
      });
    }

    // إضافة العملاء الجدد
    if (recentCustomers) {
      recentCustomers.forEach(customer => {
        activities.push({
          id: `customer-${customer.id}`,
          type: 'customer',
          title: 'عميل جديد',
          description: `تم تسجيل ${customer.name}`,
          time: new Date(customer.created_at).toLocaleTimeString('ar-EG', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          icon: Users,
          color: 'bg-green-100 text-green-700'
        });
      });
    }

    // إضافة المتابعات المكتملة
    if (recentFollowUps) {
      recentFollowUps.forEach(followUp => {
        activities.push({
          id: `followup-${followUp.id}`,
          type: 'followup',
          title: 'متابعة مكتملة',
          description: `تم التواصل مع ${followUp.customers?.name}`,
          time: followUp.completed_at ? new Date(followUp.completed_at).toLocaleTimeString('ar-EG', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }) : '',
          icon: MessageSquare,
          color: 'bg-orange-100 text-orange-700'
        });
      });
    }

    // ترتيب الأنشطة حسب الوقت
    return activities.sort((a, b) => {
      const timeA = new Date(`2024-01-01 ${a.time}`);
      const timeB = new Date(`2024-01-01 ${b.time}`);
      return timeB.getTime() - timeA.getTime();
    }).slice(0, 5); // أحدث 5 أنشطة
  };

  const activities = generateActivities();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <Clock className="h-5 w-5" />
          النشاط الأخير - البيانات الحقيقية
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.length > 0 ? (
            activities.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex items-start gap-3 p-2 sm:p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`p-2 rounded-lg ${activity.color} flex-shrink-0`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                      <span className="text-xs text-gray-500 flex-shrink-0">{activity.time}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{activity.description}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">لا توجد أنشطة حديثة</p>
              <p className="text-xs text-gray-400 mt-1">ستظهر الأنشطة الجديدة هنا</p>
            </div>
          )}
        </div>
        {activities.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500 text-center">
              آخر تحديث: {new Date().toLocaleTimeString('ar-EG')}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
