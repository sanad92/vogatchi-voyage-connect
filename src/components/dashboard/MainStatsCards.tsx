
import { Calendar, Users, DollarSign, TrendingUp } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import FinancialDashboardWidget from "@/components/reports/FinancialDashboardWidget";

interface MainStatsCardsProps {
  realStats: {
    totalBookings: number;
    totalRevenue: number;
    activeCustomers: number;
    monthlyGrowth: number;
  };
}

const MainStatsCards = ({ realStats }: MainStatsCardsProps) => {
  return (
    <div className="space-y-6">
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
      
      {/* إضافة Widget الوضع المالي */}
      <FinancialDashboardWidget />
    </div>
  );
};

export default MainStatsCards;
