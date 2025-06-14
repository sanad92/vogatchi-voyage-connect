
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, MessageSquare, AlertCircle, CheckCircle2, Plus, Phone, Mail } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navbar />
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* العنوان والإحصائيات السريعة */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 flex items-center gap-2">
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8" />
                العمليات اليومية
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                جميع مهامك وأنشطتك لليوم في مكان واحد
              </p>
            </div>
            <div className="text-sm text-gray-600">
              {new Date().toLocaleDateString('ar-EG', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>

          {/* الإحصائيات السريعة */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">مهام عالقة</p>
                    <p className="text-2xl font-bold text-yellow-600">{pendingTasks}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">قيد التنفيذ</p>
                    <p className="text-2xl font-bold text-blue-600">{inProgressTasks}</p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">مكتملة</p>
                    <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
                  </div>
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">وصول اليوم</p>
                    <p className="text-2xl font-bold text-orange-600">{todayBookingsCount}</p>
                  </div>
                  <Users className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>
          </div>
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
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>إجراءات سريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Button className="h-20 flex-col">
                <Plus className="h-6 w-6 mb-2" />
                عميل جديد
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Calendar className="h-6 w-6 mb-2" />
                حجز جديد
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <MessageSquare className="h-6 w-6 mb-2" />
                رسالة جماعية
              </Button>
              <Button variant="outline" className="h-20 flex-col">
                <Users className="h-6 w-6 mb-2" />
                إدارة العملاء
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DailyOperations;
