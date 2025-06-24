
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useOptimizedDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['optimized-dashboard'],
    queryFn: async () => {
      try {
        console.log('📊 Fetching dashboard data...');
        
        // جلب البيانات بالتوازي بدلاً من المتسلسل
        const [
          hotelBookingsResult,
          customersResult,
          recentBookingsResult,
          recentCustomersResult
        ] = await Promise.allSettled([
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

        // معالجة النتائج مع fallback data
        const hotelBookings = hotelBookingsResult.status === 'fulfilled' && !hotelBookingsResult.value.error 
          ? hotelBookingsResult.value.data || [] 
          : [];
          
        const customers = customersResult.status === 'fulfilled' && !customersResult.value.error 
          ? customersResult.value.data || [] 
          : [];
          
        const recentBookings = recentBookingsResult.status === 'fulfilled' && !recentBookingsResult.value.error 
          ? recentBookingsResult.value.data || [] 
          : [];
          
        const recentCustomers = recentCustomersResult.status === 'fulfilled' && !recentCustomersResult.value.error 
          ? recentCustomersResult.value.data || [] 
          : [];

        console.log('📊 Dashboard data fetched:', {
          hotelBookings: hotelBookings.length,
          customers: customers.length,
          recentBookings: recentBookings.length,
          recentCustomers: recentCustomers.length
        });

        // حساب الإحصائيات مع fallback values
        const totalBookings = hotelBookings.length || 0;
        const totalRevenue = hotelBookings.reduce((sum, booking) => 
          sum + (booking.total_cost_customer || 0), 0
        ) || 0;
        const activeCustomers = customers.length || 0;

        // حساب معدل النمو الشهري مع حماية من الأخطاء
        let monthlyGrowth = 0;
        try {
          const currentMonth = new Date();
          const currentMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
          const previousMonthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);

          const currentMonthBookings = hotelBookings.filter(booking => {
            try {
              return new Date(booking.created_at) >= currentMonthStart;
            } catch {
              return false;
            }
          });
          
          const previousMonthBookings = hotelBookings.filter(booking => {
            try {
              const date = new Date(booking.created_at);
              return date >= previousMonthStart && date < currentMonthStart;
            } catch {
              return false;
            }
          });

          const currentMonthRevenue = currentMonthBookings.reduce((sum, booking) => 
            sum + (booking.total_cost_customer || 0), 0
          );
          const previousMonthRevenue = previousMonthBookings.reduce((sum, booking) => 
            sum + (booking.total_cost_customer || 0), 0
          );

          monthlyGrowth = previousMonthRevenue > 0 
            ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 
            : 0;
        } catch (error) {
          console.warn('⚠️ Error calculating monthly growth:', error);
          monthlyGrowth = 0;
        }

        // حساب إحصائيات CRM مع حماية من الأخطاء
        const vipCustomers = customers.filter(c => (c.total_bookings || 0) >= 10).length || 0;
        const loyaltyPoints = customers.reduce((sum, customer) => 
          sum + (customer.loyalty_points || 0), 0
        ) || 0;

        const result = {
          realStats: {
            totalBookings,
            totalRevenue,
            activeCustomers,
            monthlyGrowth: Number(monthlyGrowth.toFixed(1))
          },
          crmStats: {
            vipCustomers,
            loyaltyPoints
          },
          customers,
          recentBookings,
          recentCustomers
        };

        console.log('✅ Dashboard data processed:', result);
        return result;
        
      } catch (error) {
        console.error('❌ خطأ في جلب بيانات الداشبورد:', error);
        
        // إرجاع بيانات افتراضية في حالة الخطأ
        return {
          realStats: {
            totalBookings: 0,
            totalRevenue: 0,
            activeCustomers: 0,
            monthlyGrowth: 0
          },
          crmStats: {
            vipCustomers: 0,
            loyaltyPoints: 0
          },
          customers: [],
          recentBookings: [],
          recentCustomers: []
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 دقائق
    refetchInterval: 10 * 60 * 1000, // إعادة التحديث كل 10 دقائق
    retry: 1, // تقليل عدد المحاولات
    retryDelay: 1000
  });

  return {
    dashboardData: data,
    isLoading,
    error
  };
};
