
import { useAuthState } from "@/hooks/useAuthState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Users, DollarSign, TrendingUp, Bell, Star, Target, Award } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import TodayOverview from "@/components/dashboard/TodayOverview";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentActivity from "@/components/dashboard/RecentActivity";
import NotificationCenter from "@/components/crm/NotificationCenter";
import { useNotifications } from "@/hooks/useNotifications";
import { useCRM } from "@/hooks/useCRM";

const Index = () => {
  const { user } = useAuthState();
  const { unreadCount } = useNotifications();
  const { customerSegments } = useCRM();

  const mockStats = {
    totalBookings: 156,
    totalRevenue: 2450000,
    activeCustomers: 89,
    monthlyGrowth: 15.2
  };

  const vipCustomers = customerSegments?.find(s => s.name === 'VIP')?.minimum_bookings || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">مرحباً بعودتك!</h1>
          <p className="text-gray-600">نظرة عامة على أداء شركتك اليوم</p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationCenter />
          <div className="text-sm text-gray-600">
            {new Date().toLocaleDateString('ar-EG', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* المؤشرات الرئيسية المحدثة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="إجمالي الحجوزات"
          value={mockStats.totalBookings.toString()}
          icon={Calendar}
          change="+12%"
          changeType="positive"
        />
        <StatsCard
          title="الإيرادات الشهرية"
          value={`${(mockStats.totalRevenue / 1000000).toFixed(1)}م ج.م`}
          icon={DollarSign}
          change="+8.2%"
          changeType="positive"
        />
        <StatsCard
          title="العملاء النشطين"
          value={mockStats.activeCustomers.toString()}
          icon={Users}
          change="+5.1%"
          changeType="positive"
        />
        <StatsCard
          title="معدل النمو"
          value={`${mockStats.monthlyGrowth}%`}
          icon={TrendingUp}
          change="+2.3%"
          changeType="positive"
        />
      </div>

      {/* مؤشرات CRM الجديدة */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عملاء VIP</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground">+3 هذا الشهر</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نقاط الولاء المسترد</CardTitle>
            <Award className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12,450</div>
            <p className="text-xs text-muted-foreground">نقطة هذا الشهر</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الحملات النشطة</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">حملة تسويقية</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإشعارات</CardTitle>
            <Bell className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadCount || 0}</div>
            <p className="text-xs text-muted-foreground">إشعار غير مقروء</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodayOverview />
        <QuickActions />
      </div>

      {/* قسم التحليلات السريعة */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            تحليلات سريعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">أفضل أداء</h4>
              <p className="text-sm text-gray-600">حجوزات الفنادق تمثل 65% من الإيرادات</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-600 mb-2">فرصة تحسين</h4>
              <p className="text-sm text-gray-600">زيادة استخدام نقاط الولاء بنسبة 23%</p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-purple-600 mb-2">توصية</h4>
              <p className="text-sm text-gray-600">استهداف العملاء غير النشطين بحملة تسويقية</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <RecentActivity />
    </div>
  );
};

export default Index;
