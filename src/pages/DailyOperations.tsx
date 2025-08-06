
import Navbar from "@/components/Navbar";
import DailyStats from "@/components/daily-operations/DailyStats";
import QuickActions from "@/components/daily-operations/QuickActions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MessageSquare, Users, Phone, Mail } from "lucide-react";
import { useCustomerService } from "@/hooks/useCustomerService";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import FollowUpCard from "@/components/customer-service/FollowUpCard";

const DailyOperations = () => {
  const { todayTasks, updateFollowUp, addCommunication } = useCustomerService();

  // جلب الحجوزات المستحقة اليوم
  const { data: todayBookings } = useQuery({
    queryKey: ['today-bookings'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customers(name, phone, email)
        `)
        .eq('check_in_date', today)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // إحصائيات سريعة لليوم
  const pendingTasks = todayTasks?.filter(task => task.status === 'pending').length || 0;
  const completedTasks = todayTasks?.filter(task => task.status === 'completed').length || 0;
  const inProgressTasks = todayTasks?.filter(task => task.status === 'in_progress').length || 0;
  const todayBookingsCount = todayBookings?.length || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="w-full px-4 md:px-6 lg:px-8 py-4 sm:py-8">
        {/* العنوان والإحصائيات السريعة */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8" />
                العمليات اليومية
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground mt-1">
                جميع مهامك وأنشطتك لليوم في مكان واحد
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>

          {/* الإحصائيات السريعة */}
          <DailyStats
            pendingTasks={pendingTasks}
            inProgressTasks={inProgressTasks}
            completedTasks={completedTasks}
            todayBookingsCount={todayBookingsCount}
          />
        </div>

        {/* المحتوى الرئيسي */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* مهام المتابعة */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  مهام المتابعة اليوم ({todayTasks?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayTasks && todayTasks.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {todayTasks.map((task) => (
                      <FollowUpCard
                        key={task.id}
                        followUp={task}
                        onUpdate={updateFollowUp}
                        onCommunicate={addCommunication}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>لا توجد مهام متابعة لهذا اليوم</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* الوصول اليوم */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  وصول العملاء اليوم ({todayBookingsCount})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {todayBookings && todayBookings.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {todayBookings.map((booking) => (
                      <div key={booking.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium">{booking.customers?.name}</h4>
                          <Badge variant="outline">{booking.status}</Badge>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {booking.customers?.phone}
                          </div>
                          {booking.customers?.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="h-4 w-4" />
                              {booking.customers.email}
                            </div>
                          )}
                          <div>حجز رقم: {booking.booking_reference}</div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          <Button size="sm" variant="outline">
                            <Phone className="h-4 w-4 mr-1" />
                            اتصال
                          </Button>
                          <Button size="sm" variant="outline">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            واتساب
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>لا يوجد عملاء وصول لهذا اليوم</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Actions سريعة */}
        <QuickActions />
      </div>
    </div>
  );
};

export default DailyOperations;
