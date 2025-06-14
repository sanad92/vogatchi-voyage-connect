
import Navbar from "@/components/Navbar";
import { Users, Building, Calendar, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import StatsCard from "@/components/dashboard/StatsCard";
import QuickActions from "@/components/dashboard/QuickActions";
import TodayOverview from "@/components/dashboard/TodayOverview";
import RecentActivity from "@/components/dashboard/RecentActivity";

const Index = () => {
  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [customers, employees, bookings, conversations] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact' }),
        supabase.from('suppliers').select('id', { count: 'exact' }),
        supabase.from('bookings').select('id', { count: 'exact' }),
        supabase.from('conversations').select('id', { count: 'exact' })
      ]);

      return {
        customers: customers.count || 0,
        suppliers: employees.count || 0,
        bookings: bookings.count || 0,
        conversations: conversations.count || 0
      };
    }
  });

  const statsData = [
    { 
      title: "إجمالي العملاء", 
      value: stats?.customers || 0, 
      icon: Users, 
      color: "bg-blue-600",
      description: "عميل مسجل"
    },
    { 
      title: "عدد الموردين", 
      value: stats?.suppliers || 0, 
      icon: Building, 
      color: "bg-orange-500",
      description: "مورد نشط"
    },
    { 
      title: "الحجوزات النشطة", 
      value: stats?.bookings || 0, 
      icon: Calendar, 
      color: "bg-green-600",
      description: "حجز فعال"
    },
    { 
      title: "جلسات واتساب", 
      value: stats?.conversations || 0, 
      icon: MessageCircle, 
      color: "bg-[#25d366]",
      description: "محادثة نشطة"
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50">
      <Navbar />
      <div className="container mx-auto px-4 py-6 sm:py-10 space-y-6 sm:space-y-8">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-blue-700">
            مرحباً بك في Vogatchi Tourism
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            نظام إدارة شامل للرحلات السياحية وخدمة العملاء
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {statsData.map((stat) => (
            <StatsCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              description={stat.description}
            />
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 sm:gap-8">
          
          {/* Left Column - Today Overview & Quick Actions */}
          <div className="xl:col-span-2 space-y-6">
            <TodayOverview />
            <QuickActions />
          </div>

          {/* Right Column - Recent Activity */}
          <div className="xl:col-span-1">
            <RecentActivity />
          </div>
        </div>

        {/* Footer Info */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6 text-center">
          <h3 className="font-semibold text-gray-800 mb-2">نصائح للاستخدام الأمثل</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>تابع مهام اليوم في قسم خدمة العملاء</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-green-600" />
              <span>سجل العملاء الجدد فور وصولهم</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-orange-600" />
              <span>استخدم الواتساب للتواصل السريع</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
