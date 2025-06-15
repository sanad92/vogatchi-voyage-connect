
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  TrendingUp, 
  Users, 
  DollarSign, 
  BarChart3, 
  Bell, 
  Filter, 
  Calendar,
  Download,
  Settings,
  RefreshCw
} from "lucide-react";
import ReportsOverview from "@/components/reports/ReportsOverview";
import AdvancedFilters from "@/components/reports/AdvancedFilters";
import InteractiveCharts from "@/components/reports/InteractiveCharts";
import ReportExporter from "@/components/reports/ReportExporter";
import FinancialReports from "@/components/reports/FinancialReports";
import PerformanceMetrics from "@/components/reports/PerformanceMetrics";
import AdvancedAnalytics from "@/components/reports/AdvancedAnalytics";
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
  const [activeTab, setActiveTab] = useState("overview");
  const [filters, setFilters] = useState<ReportFilters>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    to: new Date()
  });

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

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting report as ${format}`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // محاكاة تحديث البيانات
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsRefreshing(false);
  };

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">النظام المتقدم للتقارير والتحليلات</h1>
          <p className="text-gray-600 mt-1">
            لوحة تحكم شاملة للتقارير المالية وتحليل الأداء
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-green-50 text-green-700">
            البيانات محدثة
          </Badge>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button>
            <Settings className="h-4 w-4 mr-2" />
            إعدادات التقارير
          </Button>
        </div>
      </div>

      {/* فلاتر التقارير المتقدمة */}
      <AdvancedFilters onFiltersChange={handleFiltersChange} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-2">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-8 gap-1">
            <TabsTrigger value="overview" className="flex items-center gap-2 text-xs lg:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">نظرة عامة</span>
            </TabsTrigger>
            <TabsTrigger value="charts" className="flex items-center gap-2 text-xs lg:text-sm">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">رسوم بيانية</span>
            </TabsTrigger>
            <TabsTrigger value="export" className="flex items-center gap-2 text-xs lg:text-sm">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تصدير</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 text-xs lg:text-sm">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">تحليلات متقدمة</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center gap-2 text-xs lg:text-sm">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">مقارنة الفترات</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center gap-2 text-xs lg:text-sm">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">التنبيهات</span>
            </TabsTrigger>
            <TabsTrigger value="financial" className="flex items-center gap-2 text-xs lg:text-sm">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">التقارير المالية</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2 text-xs lg:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">الأداء</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-[600px]">
          <TabsContent value="overview" className="space-y-6">
            <ReportsOverview dateRange={dateRange} />
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <InteractiveCharts 
                data={mockFinancialData.monthlyData}
                title="الأداء المالي"
                period="آخر 6 أشهر"
              />
              <InteractiveCharts 
                data={mockFinancialData.serviceBreakdown}
                title="توزيع الخدمات"
                period="الشهر الحالي"
              />
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ReportExporter />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>التقارير المحفوظة</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">التقرير المالي الشهري</div>
                      <div className="text-sm text-gray-600">آخر تحديث: منذ ساعتين</div>
                      <Button size="sm" variant="outline" className="mt-2">
                        <Download className="h-3 w-3 mr-1" />
                        تحميل
                      </Button>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">تقرير المبيعات الأسبوعي</div>
                      <div className="text-sm text-gray-600">آخر تحديث: أمس</div>
                      <Button size="sm" variant="outline" className="mt-2">
                        <Download className="h-3 w-3 mr-1" />
                        تحميل
                      </Button>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">تحليل العملاء الربعي</div>
                      <div className="text-sm text-gray-600">آخر تحديث: منذ 3 أيام</div>
                      <Button size="sm" variant="outline" className="mt-2">
                        <Download className="h-3 w-3 mr-1" />
                        تحميل
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

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
              <PerformanceMetrics />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    إحصائيات العمليات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">2,156</div>
                      <div className="text-sm text-gray-600">إجمالي الحجوزات</div>
                      <div className="text-xs text-green-600">+18% عن الشهر السابق</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-green-600">94.2%</div>
                      <div className="text-sm text-gray-600">معدل النجاح</div>
                      <div className="text-xs text-gray-500">من الحجوزات المؤكدة</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">2.3 ساعة</div>
                      <div className="text-sm text-gray-600">متوسط وقت المعالجة</div>
                      <div className="text-xs text-green-600">-15% عن الشهر السابق</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">4.7/5</div>
                      <div className="text-sm text-gray-600">تقييم رضا العملاء</div>
                      <div className="text-xs text-green-600">+0.3 نقطة</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default Reports;
