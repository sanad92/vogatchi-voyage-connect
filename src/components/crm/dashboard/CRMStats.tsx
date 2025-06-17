
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCustomers } from '@/hooks/useCustomers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Users, Star, TrendingUp, DollarSign } from 'lucide-react';

const CRMStats = () => {
  const { customers } = useCustomers();

  // جلب إحصائيات الحجوزات
  const { data: bookingStats } = useQuery({
    queryKey: ['booking-stats'],
    queryFn: async () => {
      const [hotelBookings, flightBookings] = await Promise.all([
        supabase.from('hotel_bookings').select('total_cost_customer, customer_id').not('customer_id', 'is', null),
        supabase.from('flight_bookings').select('total_cost, customer_id').not('customer_id', 'is', null)
      ]);

      const totalRevenue = [
        ...(hotelBookings.data || []).map(b => b.total_cost_customer || 0),
        ...(flightBookings.data || []).map(b => b.total_cost || 0)
      ].reduce((sum, cost) => sum + cost, 0);

      const totalBookings = (hotelBookings.data?.length || 0) + (flightBookings.data?.length || 0);

      return { totalRevenue, totalBookings };
    }
  });

  const stats = {
    totalCustomers: customers?.length || 0,
    vipCustomers: customers?.filter(c => c.total_bookings && c.total_bookings >= 5).length || 0,
    totalLoyaltyPoints: customers?.reduce((sum, c) => sum + (c.loyalty_points || 0), 0) || 0,
    averageOrderValue: bookingStats?.totalBookings ? 
      Math.round(bookingStats.totalRevenue / bookingStats.totalBookings) : 0
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
          <Users className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{stats.totalCustomers}</div>
          <p className="text-xs text-muted-foreground">عميل مسجل</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">عملاء VIP</CardTitle>
          <Star className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats.vipCustomers}</div>
          <p className="text-xs text-muted-foreground">عميل متميز (5+ حجوزات)</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">نقاط الولاء</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-purple-600">{stats.totalLoyaltyPoints.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">نقطة ولاء إجمالية</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">متوسط قيمة الحجز</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats.averageOrderValue.toLocaleString()} ج.م</div>
          <p className="text-xs text-muted-foreground">متوسط قيمة الطلب</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMStats;
