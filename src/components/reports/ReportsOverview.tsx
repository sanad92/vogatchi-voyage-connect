
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Calendar,
  FileText,
  BarChart3,
  Download
} from "lucide-react";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ReportsOverviewProps {
  dateRange: { from: Date; to: Date };
}

const ReportsOverview = ({ dateRange }: ReportsOverviewProps) => {
  const [selectedMetric, setSelectedMetric] = useState("revenue");

  // جلب البيانات الحقيقية من قاعدة البيانات
  const { data: hotelBookings } = useQuery({
    queryKey: ['hotel-bookings-overview', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hotel_bookings')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: customers } = useQuery({
    queryKey: ['customers-overview', dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());
      
      if (error) throw error;
      return data || [];
    }
  });

  // حساب المقاييس الرئيسية من البيانات الحقيقية
  const calculateMetrics = () => {
    if (!hotelBookings || !customers) {
      return {
        totalRevenue: { value: 0, change: 0, trend: "up" },
        totalBookings: { value: 0, change: 0, trend: "up" },
        avgBookingValue: { value: 0, change: 0, trend: "up" },
        customerRetention: { value: 0, change: 0, trend: "up" }
      };
    }

    const totalRevenue = hotelBookings.reduce((sum, booking) => 
      sum + (booking.total_cost_customer || 0), 0
    );
    
    const totalBookings = hotelBookings.length;
    const avgBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0;
    const totalCustomers = customers.length;

    return {
      totalRevenue: { value: totalRevenue, change: 0, trend: "up" },
      totalBookings: { value: totalBookings, change: 0, trend: "up" },
      avgBookingValue: { value: avgBookingValue, change: 0, trend: "up" },
      customerRetention: { value: totalCustomers, change: 0, trend: "up" }
    };
  };

  const keyMetrics = calculateMetrics();

  const chartConfig = {
    revenue: { label: "الإيرادات", color: "#0088FE" },
    bookings: { label: "الحجوزات", color: "#00C49F" },
    profit: { label: "الأرباح", color: "#FFBB28" }
  };

  const getTrendIcon = (trend: string) => {
    return trend === "up" ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getTrendColor = (trend: string) => {
    return trend === "up" ? "text-green-600" : "text-red-600";
  };

  return (
    <div className="space-y-6">
      {/* المقاييس الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {keyMetrics.totalRevenue.value.toLocaleString()} ج.م
            </div>
            <div className={`flex items-center gap-1 text-xs ${getTrendColor(keyMetrics.totalRevenue.trend)}`}>
              {getTrendIcon(keyMetrics.totalRevenue.trend)}
              من البيانات الحقيقية
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الحجوزات</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.totalBookings.value}</div>
            <div className={`flex items-center gap-1 text-xs ${getTrendColor(keyMetrics.totalBookings.trend)}`}>
              {getTrendIcon(keyMetrics.totalBookings.trend)}
              من البيانات الحقيقية
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط قيمة الحجز</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.avgBookingValue.value.toFixed(0)} ج.م</div>
            <div className={`flex items-center gap-1 text-xs ${getTrendColor(keyMetrics.avgBookingValue.trend)}`}>
              {getTrendIcon(keyMetrics.avgBookingValue.trend)}
              من البيانات الحقيقية
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.customerRetention.value}</div>
            <div className={`flex items-center gap-1 text-xs ${getTrendColor(keyMetrics.customerRetention.trend)}`}>
              {getTrendIcon(keyMetrics.customerRetention.trend)}
              من البيانات الحقيقية
            </div>
          </CardContent>
        </Card>
      </div>

      {/* إجراءات سريعة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>تصدير التقارير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                تصدير PDF
              </Button>
              <Button className="w-full" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                تصدير Excel
              </Button>
              <Button className="w-full" variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                تقرير مخصص
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>إحصائيات سريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">الحجوزات النشطة</span>
                <span className="font-bold">{hotelBookings?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">العملاء المسجلين</span>
                <span className="font-bold">{customers?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">الإيرادات الإجمالية</span>
                <span className="font-bold">{keyMetrics.totalRevenue.value.toLocaleString()} ج.م</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>نظرة عامة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-2">
              <div className="text-sm text-gray-600">
                يعرض النظام البيانات الحقيقية من قاعدة البيانات
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700">
                البيانات محدثة
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsOverview;
