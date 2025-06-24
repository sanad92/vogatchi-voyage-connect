
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useOptimizedDashboard = () => {
  // استعلام واحد محسن لجلب جميع البيانات المطلوبة
  const { data, isLoading, error } = useQuery({
    queryKey: ['optimized-dashboard'],
    queryFn: async () => {
      try {
        // جلب البيانات بالتوازي بدلاً من المتسلسل
        const [
          hotelBookingsResult,
          customersResult,
          recentBookingsResult,
          recentCustomersResult
        ] = await Promise.all([
          supabase
            .from('hotel_bookings')
            .select('total_cost_customer, created_at')
            .order('created_at', { ascending: false }),
          
          supabase
            .from('customers')
            .select('id, name, total_bookings, loyalty_points, created_at')
            .order('created_at', { ascending: false }),
            
          supabase
            .from('hotel_bookings')
            .select('id, customer_name, hotel_name, total_cost_customer, created_at')
            .order('created_at', { ascending: false })
            .limit(3),
            
          supabase
            .from('customers')
            .select('id, name, created_at')
            .order('created_at', { ascending: false })
            .limit(2)
        ]);

        // التحقق من الأخطاء
        if (hotelBookingsResult.error) throw hotelBookingsResult.error;
        if (customersResult.error) throw customersResult.error;
        if (recentBookingsResult.error) throw recentBookingsResult.error;
        if (recentCustomersResult.error) throw recentCustomersResult.error;

        const hotelBookings = hotelBookingsResult.data || [];
        const customers = customersResult.data || [];
        const recentBookings = recentBookingsResult.data || [];
        const recentCustomers = recentCustomersResult.data || [];

        // حساب الإحصائيات
        const totalBookings = hotelBookings.length;
        const totalRevenue = hotelBookings.reduce((sum, booking) => 
          sum + (booking.total_cost_customer || 0), 0
        );
        const activeCustomers = customers.length;

        // حساب معدل النمو الشهري
        const currentMonth = new Date();
        const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        const previousMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);

        const currentMonthBookings = hotelBookings.filter(booking => 
          new Date(booking.created_at) >= currentMonthStart
        );
        const previousMonthBookings = hotelBookings.filter(booking => 
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

        // حساب إحصائيات CRM
        const vipCustomers = customers.filter(c => c.total_bookings >= 10).length;
        const loyaltyPoints = customers.reduce((sum, customer) => 
          sum + (customer.loyalty_points || 0), 0
        );

        return {
          realStats: {
            totalBookings,
            totalRevenue,
            activeCustomers,
            monthlyGrowth
          },
          crmStats: {
            vipCustomers,
            loyaltyPoints
          },
          customers,
          recentBookings,
          recentCustomers
        };
      } catch (error) {
        console.error('خطأ في جلب بيانات الداشبورد:', error);
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 دقائق
    refetchInterval: 10 * 60 * 1000, // إعادة التحديث كل 10 دقائق
    retry: 2,
    retryDelay: 1000
  });

  return {
    dashboardData: data,
    isLoading,
    error
  };
};
