
import Navbar from "@/components/Navbar";
import TodayTasks from "@/components/customer-service/TodayTasks";
import ServiceStats from "@/components/customer-service/ServiceStats";
import ServicePerformance from "@/components/customer-service/ServicePerformance";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, AlertCircle } from "lucide-react";
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
          <ServiceStats
            todayTasksCount={todayTasksCount}
            pendingTasks={pendingTasks}
            inProgressTasks={inProgressTasks}
            completedToday={completedToday}
            overdueTasks={overdueTasks}
            totalTasks={totalTasks}
          />
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
        <ServicePerformance 
          todayTasksCount={todayTasksCount}
          completedToday={completedToday}
        />
      </div>
    </div>
  );
};

export default CustomerService;
