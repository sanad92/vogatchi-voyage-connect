
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
  AreaChart,
  Area
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

  const chartConfig = {
    revenue: { label: "الإيرادات", color: "#0088FE" },
    bookings: { label: "الحجوزات", color: "#00C49F" },
    profit: { label: "الأرباح", color: "#FFBB28" },
    customers: { label: "العملاء", color: "#FF8042" }
  };

  const renderChart = () => {
    const height = isFullscreen ? 600 : 400;
    
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500">
          لا توجد بيانات لعرضها
        </div>
      );
    }
    
    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
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
            <LineChart data={data}>
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
            <AreaChart data={data}>
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
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={Math.min(height * 0.3, 120)}
                fill="#8884d8"
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color || chartConfig.revenue.color} />
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
      </CardContent>
    </Card>
  );
};

export default InteractiveCharts;
