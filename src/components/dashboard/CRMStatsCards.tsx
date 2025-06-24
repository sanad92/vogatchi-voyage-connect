
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Star, Target, Award } from "lucide-react";
import { useCRM } from "@/hooks/useCRM";
import { useNotifications } from "@/hooks/useNotifications";

interface CRMStatsCardsProps {
  customers: any[] | undefined;
  realStats: {
    totalBookings: number;
    totalRevenue: number;
    activeCustomers: number;
    monthlyGrowth: number;
  };
}

const CRMStatsCards = ({ customers, realStats }: CRMStatsCardsProps) => {
  const { customerSegments } = useCRM();
  const { unreadCount } = useNotifications();

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
  );
};

export default CRMStatsCards;
