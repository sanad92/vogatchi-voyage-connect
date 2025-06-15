
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useRealTimeStats = () => {
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

  return {
    realStats: calculateRealStats(),
    customers,
    isLoading: !hotelBookings && !customers && !monthlyBookings
  };
};
