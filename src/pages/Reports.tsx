
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, TrendingUp, Users, DollarSign, BarChart3, Bell, Filter, Calendar } from "lucide-react";
import ReportsChart from "@/components/reports/ReportsChart";
import PerformanceMetrics from "@/components/reports/PerformanceMetrics";
import FinancialReports from "@/components/reports/FinancialReports";
import AdvancedAnalytics from "@/components/reports/AdvancedAnalytics";
import SmartReportFilters from "@/components/reports/SmartReportFilters";
import PeriodComparison from "@/components/reports/PeriodComparison";
import SmartAlerts from "@/components/reports/SmartAlerts";
import { DateRange } from "react-day-picker";

interface ReportFilters {
  dateRange?: DateRange;
  customerName?: string;
  serviceType?: string;
  status?: string;
  supplier?: string;
  minAmount?: number;
  maxAmount?: number;
}

const Reports = () => {
  const [filters, setFilters] = useState<ReportFilters>({});

  // بيانات تجريبية للتقارير المالية
  const mockFinancialData = {
    revenue: 2500000,
    profit: 750000,
    expenses: 1750000,
    profitMargin: 30,
    monthlyData: [
      { month: 'يناير', revenue: 180000, profit: 54000, expenses: 126000 },
      { month: 'فبراير', revenue: 220000, profit: 66000, expenses: 154000 },
      { month: 'مارس', revenue: 280000, profit: 84000, expenses: 196000 },
      { month: 'أبريل', revenue: 320000, profit: 96000, expenses: 224000 },
      { month: 'مايو', revenue: 290000, profit: 87000, expenses: 203000 },
      { month: 'يونيو', revenue: 350000, profit: 105000, expenses: 245000 },
    ],
    serviceBreakdown: [
      { name: 'فنادق', value: 1200000, color: '#0088FE' },
      { name: 'طيران', value: 800000, color: '#00C49F' },
      { name: 'باقات سياحية', value: 400000, color: '#FFBB28' },
      { name: 'تأشيرات', value: 100000, color: '#FF8042' },
    ]
  };

  // بيانات تجريبية للرسوم البيانية
  const mockChartData = [
    { name: 'يناير', value: 180000 },
    { name: 'فبراير', value: 220000 },
    { name: 'مارس', value: 280000 },
    { name: 'أبريل', value: 320000 },
    { name: 'مايو', value: 290000 },
    { name: 'يونيو', value: 350000 },
  ];

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting report as ${format}`);
    // يمكن تنفيذ منطق التصدير هنا
  };

  const handleRefresh = () => {
    console.log('Refreshing reports...');
    // يمكن تنفيذ منطق التحديث هنا
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">النظام المتقدم للتقارير والتحليلات</h1>
      </div>

      {/* فلاتر التقارير الذكية */}
      <SmartReportFilters 
        onFiltersChange={setFilters}
        onExport={handleExport}
        onRefresh={handleRefresh}
      />

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            تحليلات متقدمة
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            مقارنة الفترات
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            التنبيهات الذكية
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            التقارير المالية
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            الأداء
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            العمليات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          <AdvancedAnalytics />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <PeriodComparison />
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <SmartAlerts />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <FinancialReports data={mockFinancialData} period="آخر 6 أشهر" />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReportsChart 
              type="line"
              data={mockChartData}
              title="إيرادات الأشهر الماضية"
              dataKey="value"
              xAxisKey="name"
            />
            <PerformanceMetrics />
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الحجوزات</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2,156</div>
                <p className="text-xs text-muted-foreground">+18% عن الشهر السابق</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">معدل النجاح</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94.2%</div>
                <p className="text-xs text-muted-foreground">من الحجوزات المؤكدة</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط وقت المعالجة</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">2.3 ساعة</div>
                <p className="text-xs text-muted-foreground">-15% عن الشهر السابق</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
