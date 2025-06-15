
import { useAuthState } from "@/hooks/useAuthState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, DollarSign, TrendingUp, Bell, Star, Target, Award } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import TodayOverview from "@/components/dashboard/TodayOverview";
import QuickActions from "@/components/dashboard/QuickActions";
import RecentActivity from "@/components/dashboard/RecentActivity";
import NotificationCenter from "@/components/crm/NotificationCenter";
import { useNotifications } from "@/hooks/useNotifications";
import { useCRM } from "@/hooks/useCRM";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user } = useAuthState();
  const { unreadCount } = useNotifications();
  const { customerSegments } = useCRM();

  // جلب البيانات الحقيقية من قاعدة البيانات
  const { data: hotelBookings } = useQuery({
    queryKey: ['dashboard-hotel-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_bookings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: customers } = useQuery({
    queryKey: ['dashboard-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: monthlyBookings } = useQuery({
    queryKey: ['dashboard-monthly-bookings'],
    queryFn: async () => {
      const currentMonth = new Date();
      const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
      
      const { data, error } = await supabase
        .from('hotel_bookings')
        .select('total_cost_customer, created_at')
        .gte('created_at', previousMonth.toISOString());
      
      if (error) throw error;
      return data || [];
    }
  });

  // حساب الإحصائيات الحقيقية
  const calculateRealStats = () => {
    if (!hotelBookings || !customers || !monthlyBookings) {
      return {
        totalBookings: 0,
        totalRevenue: 0,
        activeCustomers: 0,
        monthlyGrowth: 0
      };
    }

    const totalBookings = hotelBookings.length;
    const totalRevenue = hotelBookings.reduce((sum, booking) => 
      sum + (booking.total_cost_customer || 0), 0
    );
    const activeCustomers = customers.length;

    // حساب معدل النمو الشهري
    const currentMonth = new Date();
    const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const previousMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);

    const currentMonthBookings = monthlyBookings.filter(booking => 
      new Date(booking.created_at) >= currentMonthStart
    );
    const previousMonthBookings = monthlyBookings.filter(booking => 
      new Date(booking.created_at) >= previousMonthStart && 
      new Date(booking.created_at) < currentMonthStart
    );

    const currentMonthRevenue = currentMonthBookings.reduce((sum, booking) => 
      sum + (booking.total_cost_customer || 0), 0
    );
    const previousMonthRevenue = previousMonthBookings.reduce((sum, booking) => 
      sum + (booking.total_cost_customer || 0), 0
    );

    const monthlyGrowth = previousMonthRevenue > 0 
      ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
      : 0;

    return {
      totalBookings,
      totalRevenue,
      activeCustomers,
      monthlyGrowth
    };
  };

  const realStats = calculateRealStats();

  // حساب إحصائيات CRM الحقيقية
  const calculateCRMStats = () => {
    if (!customers || !customerSegments) return { vipCustomers: 0, loyaltyPoints: 0 };

    const vipSegment = customerSegments.find(s => s.name === 'VIP' || s.name_ar === 'VIP');
    const vipCustomers = vipSegment 
      ? customers.filter(c => c.segment_id === vipSegment.id).length 
      : customers.filter(c => c.total_bookings >= 10).length;

    const loyaltyPoints = customers.reduce((sum, customer) => 
      sum + (customer.loyalty_points || 0), 0
    );

    return { vipCustomers, loyaltyPoints };
  };

  const crmStats = calculateCRMStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">مرحباً بعودتك!</h1>
          <p className="text-gray-600">نظرة عامة على أداء شركتك اليوم - البيانات الحقيقية</p>
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

      {/* المؤشرات الرئيسية المحدثة بالبيانات الحقيقية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="إجمالي الحجوزات"
          value={realStats.totalBookings.toString()}
          icon={Calendar}
          color="bg-blue-500"
        />
        <StatsCard
          title="الإيرادات الإجمالية"
          value={`${(realStats.totalRevenue / 1000000).toFixed(1)}م ج.م`}
          icon={DollarSign}
          color="bg-green-500"
        />
        <StatsCard
          title="العملاء النشطين"
          value={realStats.activeCustomers.toString()}
          icon={Users}
          color="bg-purple-500"
        />
        <StatsCard
          title="معدل النمو الشهري"
          value={`${realStats.monthlyGrowth.toFixed(1)}%`}
          icon={TrendingUp}
          color={realStats.monthlyGrowth >= 0 ? "bg-green-500" : "bg-red-500"}
        />
      </div>

      {/* مؤشرات CRM الحقيقية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عملاء VIP</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{crmStats.vipCustomers}</div>
            <p className="text-xs text-muted-foreground">من إجمالي {realStats.activeCustomers} عميل</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نقاط الولاء الإجمالية</CardTitle>
            <Award className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{crmStats.loyaltyPoints.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">نقطة ولاء نشطة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط قيمة الحجز</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {realStats.totalBookings > 0 
                ? (realStats.totalRevenue / realStats.totalBookings).toLocaleString('ar-EG', { maximumFractionDigits: 0 })
                : 0
              } ج.م
            </div>
            <p className="text-xs text-muted-foreground">متوسط قيمة الحجز</p>
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

      {/* قسم التحليلات المحدث بالبيانات الحقيقية */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            تحليلات من البيانات الحقيقية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-green-600 mb-2">أداء الحجوزات</h4>
              <p className="text-sm text-gray-600">
                {realStats.totalBookings} حجز بإجمالي إيرادات {realStats.totalRevenue.toLocaleString()} ج.م
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-blue-600 mb-2">نمو العملاء</h4>
              <p className="text-sm text-gray-600">
                {realStats.activeCustomers} عميل نشط بمعدل نمو {realStats.monthlyGrowth.toFixed(1)}%
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold text-purple-600 mb-2">برنامج الولاء</h4>
              <p className="text-sm text-gray-600">
                {crmStats.loyaltyPoints.toLocaleString()} نقطة ولاء مع {crmStats.vipCustomers} عميل VIP
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <RecentActivity />
    </div>
  );
};

export default Index;
