
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, TrendingUp, Users, DollarSign } from "lucide-react";
import ReportsChart from "@/components/reports/ReportsChart";
import PerformanceMetrics from "@/components/reports/PerformanceMetrics";
import AdvancedReportsFilters from "@/components/reports/AdvancedReportsFilters";
import FinancialReports from "@/components/reports/FinancialReports";
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

  const handleExport = (format: 'pdf' | 'excel') => {
    console.log(`Exporting report as ${format}`);
    // يمكن تنفيذ منطق التصدير هنا
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">التقارير والتحليلات</h1>
      </div>

      {/* فلاتر التقارير المتقدمة */}
      <AdvancedReportsFilters 
        filters={filters}
        onFiltersChange={setFilters}
        onExport={handleExport}
      />

      <Tabs defaultValue="financial" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financial" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            التقارير المالية
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            الأداء
          </TabsTrigger>
          <TabsTrigger value="customers" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            العملاء
          </TabsTrigger>
          <TabsTrigger value="operations" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            العمليات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          <FinancialReports data={mockFinancialData} period="آخر 6 أشهر" />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ReportsChart />
            <PerformanceMetrics />
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي العملاء</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">1,234</div>
                <p className="text-xs text-muted-foreground">+12% عن الشهر السابق</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">عملاء جدد</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">89</div>
                <p className="text-xs text-muted-foreground">هذا الشهر</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">عملاء VIP</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45</div>
                <p className="text-xs text-muted-foreground">3.6% من إجمالي العملاء</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">متوسط قيمة العميل</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">15,420 ج.م</div>
                <p className="text-xs text-muted-foreground">+8% عن الشهر السابق</p>
              </CardContent>
            </Card>
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
