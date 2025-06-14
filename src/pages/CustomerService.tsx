
import Navbar from "@/components/Navbar";
import TodayTasks from "@/components/customer-service/TodayTasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Calendar, Users, TrendingUp, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { useCustomerService } from "@/hooks/useCustomerService";
import { Link } from "react-router-dom";

const CustomerService = () => {
  const { followUps, todayTasks } = useCustomerService();

  // إحصائيات سريعة
  const totalTasks = followUps?.length || 0;
  const todayTasksCount = todayTasks?.length || 0;
  const pendingTasks = followUps?.filter(task => task.status === 'pending').length || 0;
  const completedToday = todayTasks?.filter(task => task.status === 'completed').length || 0;
  const inProgressTasks = followUps?.filter(task => task.status === 'in_progress').length || 0;

  // مهام عاجلة (المتأخرة)
  const overdueTasks = followUps?.filter(task => 
    task.status === 'pending' && 
    new Date(task.scheduled_date) < new Date()
  ).length || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navbar />
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* العنوان والإحصائيات */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-blue-700 flex items-center gap-2">
                <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8" />
                خدمة العملاء
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                إدارة ومتابعة جميع مهام خدمة العملاء والتواصل معهم
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link to="/customers">
                <Button variant="outline" className="w-full sm:w-auto">
                  <Users className="h-4 w-4 mr-2" />
                  إدارة العملاء
                </Button>
              </Link>
              <Link to="/whatsapp">
                <Button className="w-full sm:w-auto">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  واتساب
                </Button>
              </Link>
            </div>
          </div>

          {/* الإحصائيات السريعة */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">المهام اليوم</p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-600">{todayTasksCount}</p>
                  </div>
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">في الانتظار</p>
                    <p className="text-lg sm:text-2xl font-bold text-yellow-600">{pendingTasks}</p>
                  </div>
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">قيد التنفيذ</p>
                    <p className="text-lg sm:text-2xl font-bold text-orange-600">{inProgressTasks}</p>
                  </div>
                  <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">مكتمل اليوم</p>
                    <p className="text-lg sm:text-2xl font-bold text-green-600">{completedToday}</p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">متأخرة</p>
                    <p className="text-lg sm:text-2xl font-bold text-red-600">{overdueTasks}</p>
                  </div>
                  <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-gray-500">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-600">إجمالي المهام</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-600">{totalTasks}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* تنبيهات مهمة */}
        {overdueTasks > 0 && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">
                  تنبيه: يوجد {overdueTasks} مهام متأخرة تحتاج لمتابعة فورية!
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* المحتوى الرئيسي */}
        <TodayTasks />

        {/* إحصائيات أداء إضافية */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">معدل الإنجاز اليومي</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">مهام اليوم المكتملة</span>
                  <Badge variant="outline" className="text-green-700 bg-green-50">
                    {todayTasksCount > 0 ? Math.round((completedToday / todayTasksCount) * 100) : 0}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                    style={{ 
                      width: `${todayTasksCount > 0 ? (completedToday / todayTasksCount) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">إرشادات سريعة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
                  <Calendar className="h-4 w-4 text-blue-600" />
                  <span>تحقق من مهام اليوم أولاً</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  <span>ابدأ بالمهام المتأخرة</span>
                </div>
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  <span>تواصل مع العملاء بانتظام</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CustomerService;
