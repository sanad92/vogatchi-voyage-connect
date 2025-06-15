
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart
} from "recharts";
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  PieChart as PieChartIcon,
  TrendingUp,
  Download,
  Maximize2
} from "lucide-react";

interface InteractiveChartsProps {
  data: any[];
  title: string;
  period: string;
}

const InteractiveCharts = ({ data, title, period }: InteractiveChartsProps) => {
  const [chartType, setChartType] = useState<"bar" | "line" | "pie" | "area">("bar");
  const [metric, setMetric] = useState("revenue");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // بيانات تجريبية شاملة
  const revenueData = [
    { period: "يناير", revenue: 220000, bookings: 145, profit: 66000, customers: 98 },
    { period: "فبراير", revenue: 280000, bookings: 189, profit: 84000, customers: 134 },
    { period: "مارس", revenue: 350000, bookings: 234, profit: 105000, customers: 167 },
    { period: "أبريل", revenue: 420000, bookings: 278, profit: 126000, customers: 201 },
    { period: "مايو", revenue: 380000, bookings: 251, profit: 114000, customers: 178 },
    { period: "يونيو", revenue: 450000, bookings: 298, profit: 135000, customers: 223 },
  ];

  const serviceDistribution = [
    { name: "فنادق", value: 45, revenue: 1200000, color: "#0088FE" },
    { name: "طيران", value: 30, revenue: 800000, color: "#00C49F" },
    { name: "باقات", value: 15, revenue: 400000, color: "#FFBB28" },
    { name: "تأشيرات", value: 10, revenue: 200000, color: "#FF8042" },
  ];

  const chartConfig = {
    revenue: { label: "الإيرادات", color: "#0088FE" },
    bookings: { label: "الحجوزات", color: "#00C49F" },
    profit: { label: "الأرباح", color: "#FFBB28" },
    customers: { label: "العملاء", color: "#FF8042" }
  };

  const renderChart = () => {
    const height = isFullscreen ? 600 : 400;
    
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar 
                dataKey={metric} 
                fill={chartConfig[metric as keyof typeof chartConfig]?.color} 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      
      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line 
                type="monotone" 
                dataKey={metric} 
                stroke={chartConfig[metric as keyof typeof chartConfig]?.color}
                strokeWidth={3}
                dot={{ fill: chartConfig[metric as keyof typeof chartConfig]?.color, strokeWidth: 2, r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      
      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area 
                type="monotone" 
                dataKey={metric} 
                stroke={chartConfig[metric as keyof typeof chartConfig]?.color}
                fill={chartConfig[metric as keyof typeof chartConfig]?.color}
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      
      case "pie":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={serviceDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={Math.min(height * 0.3, 120)}
                fill="#8884d8"
                dataKey="value"
              >
                {serviceDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        );
      
      default:
        return null;
    }
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case "bar": return <BarChart3 className="h-4 w-4" />;
      case "line": return <LineChartIcon className="h-4 w-4" />;
      case "pie": return <PieChartIcon className="h-4 w-4" />;
      case "area": return <TrendingUp className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  return (
    <Card className={isFullscreen ? "fixed inset-4 z-50 overflow-auto" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {getChartIcon(chartType)}
              {title}
              <Badge variant="outline">{period}</Badge>
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {/* اختيار نوع الرسم البياني */}
            <div className="flex border rounded-lg p-1">
              {["bar", "line", "area", "pie"].map((type) => (
                <Button
                  key={type}
                  variant={chartType === type ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setChartType(type as any)}
                  className="h-8 px-3"
                >
                  {getChartIcon(type)}
                </Button>
              ))}
            </div>

            {/* اختيار المقياس (للرسوم غير الدائرية) */}
            {chartType !== "pie" && (
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">الإيرادات</SelectItem>
                  <SelectItem value="bookings">الحجوزات</SelectItem>
                  <SelectItem value="profit">الأرباح</SelectItem>
                  <SelectItem value="customers">العملاء</SelectItem>
                </SelectContent>
              </Select>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <ChartContainer config={chartConfig}>
          {renderChart()}
        </ChartContainer>

        {/* معلومات إضافية */}
        {chartType === "pie" && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {serviceDistribution.map((item, index) => (
              <div key={index} className="text-center">
                <div 
                  className="w-4 h-4 rounded mx-auto mb-2"
                  style={{ backgroundColor: item.color }}
                />
                <div className="text-sm font-medium">{item.name}</div>
                <div className="text-xs text-gray-600">{item.value}%</div>
                <div className="text-xs text-gray-500">
                  {item.revenue.toLocaleString()} ر.س
                </div>
              </div>
            ))}
          </div>
        )}

        {/* إحصائيات سريعة */}
        <div className="mt-6 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {revenueData.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">إجمالي الإيرادات</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {revenueData.reduce((sum, item) => sum + item.bookings, 0)}
            </div>
            <div className="text-sm text-gray-600">إجمالي الحجوزات</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {revenueData.reduce((sum, item) => sum + item.profit, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">إجمالي الأرباح</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(revenueData.reduce((sum, item) => sum + item.profit, 0) / 
                         revenueData.reduce((sum, item) => sum + item.revenue, 0) * 100)}%
            </div>
            <div className="text-sm text-gray-600">هامش الربح</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default InteractiveCharts;
