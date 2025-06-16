
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Hotel, Calendar, DollarSign, Clock, Users, TrendingUp } from "lucide-react";
import { HotelBooking } from "@/types/hotelBooking";
import { useMemo } from "react";

interface HotelBookingStatsProps {
  bookings: HotelBooking[];
}

const HotelBookingStats = ({ bookings }: HotelBookingStatsProps) => {
  const stats = useMemo(() => {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const totalBookings = bookings.length;
    const thisMonthBookings = bookings.filter(booking => 
      new Date(booking.created_at) >= thisMonth
    ).length;
    
    const totalRevenue = bookings.reduce((sum, booking) => 
      sum + (booking.total_cost_customer || 0), 0
    );
    
    const totalProfit = bookings.reduce((sum, booking) => 
      sum + (booking.total_profit || 0), 0
    );
    
    const checkingInToday = bookings.filter(booking => 
      booking.check_in_date === today.toISOString().split('T')[0]
    ).length;
    
    const checkingOutToday = bookings.filter(booking => 
      booking.check_out_date === today.toISOString().split('T')[0]
    ).length;
    
    const confirmedBookings = bookings.filter(booking => 
      booking.status_id && booking.status_id !== 'cancelled'
    ).length;
    
    const pendingBookings = bookings.filter(booking => 
      !booking.status_id || booking.status_id === 'pending'
    ).length;
    
    const cancelledBookings = bookings.filter(booking => 
      booking.status_id === 'cancelled'
    ).length;
    
    const averageNights = totalBookings > 0 
      ? bookings.reduce((sum, booking) => sum + (booking.number_of_nights || 0), 0) / totalBookings
      : 0;

    const totalNights = bookings.reduce((sum, booking) => sum + (booking.number_of_nights || 0), 0);

    return {
      totalBookings,
      thisMonthBookings,
      totalRevenue,
      totalProfit,
      checkingInToday,
      checkingOutToday,
      confirmedBookings,
      pendingBookings,
      cancelledBookings,
      averageNights: Math.round(averageNights * 10) / 10,
      totalNights
    };
  }, [bookings]);

  const statCards = [
    {
      title: "إجمالي الحجوزات",
      value: stats.totalBookings.toLocaleString(),
      subtitle: `${stats.thisMonthBookings} هذا الشهر`,
      icon: Hotel,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "الإيرادات الإجمالية",
      value: `${stats.totalRevenue.toLocaleString()} ج.م`,
      subtitle: `ربح: ${stats.totalProfit.toLocaleString()} ج.م`,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "وصول اليوم",
      value: stats.checkingInToday.toString(),
      subtitle: `مغادرة: ${stats.checkingOutToday}`,
      icon: Calendar,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    },
    {
      title: "متوسط الليالي",
      value: stats.averageNights.toString(),
      subtitle: `${stats.totalNights} ليلة إجمالي`,
      icon: Clock,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "الحجوزات المؤكدة",
      value: stats.confirmedBookings.toString(),
      subtitle: `${stats.pendingBookings} في الانتظار`,
      icon: Users,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      title: "معدل النجاح",
      value: stats.totalBookings > 0 ? `${Math.round((stats.confirmedBookings / stats.totalBookings) * 100)}%` : "0%",
      subtitle: `${stats.cancelledBookings} ملغي`,
      icon: TrendingUp,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-full ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default HotelBookingStats;
