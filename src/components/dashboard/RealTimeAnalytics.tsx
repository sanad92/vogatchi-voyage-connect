
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp } from "lucide-react";

interface RealTimeAnalyticsProps {
  realStats: {
    totalBookings: number;
    totalRevenue: number;
    activeCustomers: number;
    monthlyGrowth: number;
  };
  crmStats: {
    vipCustomers: number;
    loyaltyPoints: number;
  };
}

const RealTimeAnalytics = ({ realStats, crmStats }: RealTimeAnalyticsProps) => {
  return (
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
  );
};

export default RealTimeAnalytics;
