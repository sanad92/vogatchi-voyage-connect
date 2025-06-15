
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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

interface ReportsOverviewProps {
  dateRange: { from: Date; to: Date };
}

const ReportsOverview = ({ dateRange }: ReportsOverviewProps) => {
  const [selectedMetric, setSelectedMetric] = useState("revenue");

  // بيانات تجريبية للمقاييس الرئيسية
  const keyMetrics = {
    totalRevenue: { value: 2850000, change: 12.5, trend: "up" },
    totalBookings: { value: 1847, change: 8.3, trend: "up" },
    avgBookingValue: { value: 1543, change: -2.1, trend: "down" },
    customerRetention: { value: 68.5, change: 5.2, trend: "up" }
  };

  // بيانات الإيرادات الشهرية
  const monthlyRevenue = [
    { month: "يناير", revenue: 220000, bookings: 145, profit: 66000 },
    { month: "فبراير", revenue: 280000, bookings: 189, profit: 84000 },
    { month: "مارس", revenue: 350000, bookings: 234, profit: 105000 },
    { month: "أبريل", revenue: 420000, bookings: 278, profit: 126000 },
    { month: "مايو", revenue: 380000, bookings: 251, profit: 114000 },
    { month: "يونيو", revenue: 450000, bookings: 298, profit: 135000 },
  ];

  // بيانات أداء الخدمات
  const servicePerformance = [
    { service: "حجز فنادق", revenue: 1200000, bookings: 856, color: "#0088FE" },
    { service: "تذاكر طيران", revenue: 980000, bookings: 642, color: "#00C49F" },
    { service: "باقات سياحية", revenue: 450000, bookings: 234, color: "#FFBB28" },
    { service: "تأشيرات", revenue: 220000, bookings: 115, color: "#FF8042" },
  ];

  // بيانات العملاء الجدد مقابل المتكررين
  const customerData = [
    { type: "عملاء جدد", count: 568, percentage: 62 },
    { type: "عملاء متكررون", count: 347, percentage: 38 }
  ];

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
              {keyMetrics.totalRevenue.value.toLocaleString()} ر.س
            </div>
            <div className={`flex items-center gap-1 text-xs ${getTrendColor(keyMetrics.totalRevenue.trend)}`}>
              {getTrendIcon(keyMetrics.totalRevenue.trend)}
              {keyMetrics.totalRevenue.change}% عن الشهر السابق
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
              {keyMetrics.totalBookings.change}% عن الشهر السابق
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط قيمة الحجز</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.avgBookingValue.value} ر.س</div>
            <div className={`flex items-center gap-1 text-xs ${getTrendColor(keyMetrics.avgBookingValue.trend)}`}>
              {getTrendIcon(keyMetrics.avgBookingValue.trend)}
              {Math.abs(keyMetrics.avgBookingValue.change)}% عن الشهر السابق
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">نسبة الاحتفاظ بالعملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{keyMetrics.customerRetention.value}%</div>
            <div className={`flex items-center gap-1 text-xs ${getTrendColor(keyMetrics.customerRetention.trend)}`}>
              {getTrendIcon(keyMetrics.customerRetention.trend)}
              {keyMetrics.customerRetention.change}% عن الشهر السابق
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الرسوم البيانية الرئيسية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* رسم بياني للإيرادات الشهرية */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>الأداء الشهري</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant={selectedMetric === "revenue" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMetric("revenue")}
                >
                  الإيرادات
                </Button>
                <Button
                  variant={selectedMetric === "bookings" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMetric("bookings")}
                >
                  الحجوزات
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey={selectedMetric}
                    stroke={chartConfig[selectedMetric as keyof typeof chartConfig]?.color}
                    fill={chartConfig[selectedMetric as keyof typeof chartConfig]?.color}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* أداء الخدمات */}
        <Card>
          <CardHeader>
            <CardTitle>أداء الخدمات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {servicePerformance.map((service, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: service.color }}
                    />
                    <span className="font-medium">{service.service}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{service.revenue.toLocaleString()} ر.س</div>
                    <div className="text-sm text-gray-600">{service.bookings} حجز</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* رسوم بيانية إضافية */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* توزيع العملاء */}
        <Card>
          <CardHeader>
            <CardTitle>توزيع العملاء</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {customerData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{item.type}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{item.count}</span>
                    <Badge variant="outline">{item.percentage}%</Badge>
                  </div>
                </div>
              ))}
              <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${customerData[0].percentage}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* إحصائيات سريعة */}
        <Card>
          <CardHeader>
            <CardTitle>إحصائيات سريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">معدل التحويل</span>
                <span className="font-bold">23.5%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">متوسط المدة للحجز</span>
                <span className="font-bold">4.2 يوم</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">تقييم رضا العملاء</span>
                <span className="font-bold">4.7/5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">معدل الإلغاء</span>
                <span className="font-bold text-red-600">5.3%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* إجراءات سريعة */}
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
      </div>
    </div>
  );
};

export default ReportsOverview;
