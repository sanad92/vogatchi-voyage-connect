
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
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

  // جلب البيانات الحقيقية من قاعدة البيانات
  const { data: hotelBookings, refetch: refetchBookings } = useQuery({
    queryKey: ['reports-hotel-bookings'],
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
    queryKey: ['reports-customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // حساب البيانات المالية من البيانات الحقيقية
  const calculateFinancialData = () => {
    if (!hotelBookings) return null;

    const totalRevenue = hotelBookings.reduce((sum, booking) => 
      sum + (booking.total_cost_customer || 0), 0
    );
    
    const totalProfit = hotelBookings.reduce((sum, booking) => 
      sum + (booking.total_profit || 0), 0
    );

    const totalExpenses = totalRevenue - totalProfit;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      revenue: totalRevenue,
      profit: totalProfit,
      expenses: totalExpenses,
      profitMargin: profitMargin,
      monthlyData: [], // يمكن حسابها لاحقاً حسب الحاجة
      serviceBreakdown: [
        { name: 'حجوزات الفنادق', value: totalRevenue, color: '#0088FE' }
      ]
    };
  };

  const financialData = calculateFinancialData();

  const handleExport = (format: 'pdf' | 'excel' | 'csv') => {
    console.log(`Exporting report as ${format}`);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchBookings();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFiltersChange = (newFilters: any) => {
    setFilters(newFilters);
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">النظام المتقدم للتقارير والتحليلات</h1>
          <p className="text-muted-foreground mt-1">
            لوحة تحكم شاملة للتقارير المالية وتحليل الأداء
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline">
            البيانات الحقيقية
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
                data={hotelBookings || []}
                title="الأداء المالي"
                period="البيانات الحقيقية"
              />
              {financialData && (
                <InteractiveCharts 
                  data={financialData.serviceBreakdown}
                  title="توزيع الخدمات"
                  period="البيانات الحقيقية"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="export" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ReportExporter />
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>إحصائيات النظام</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">إجمالي الحجوزات</div>
                      <div className="text-2xl font-bold text-primary">
                        {hotelBookings?.length || 0}
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">إجمالي العملاء</div>
                      <div className="text-2xl font-bold text-primary">
                        {customers?.length || 0}
                      </div>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="font-medium">الإيرادات الإجمالية</div>
                      <div className="text-2xl font-bold text-primary">
                        {financialData?.revenue.toLocaleString() || 0} ج.م
                      </div>
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
            {financialData && (
              <FinancialReports data={financialData} period="البيانات الحقيقية" />
            )}
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PerformanceMetrics />
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    إحصائيات العمليات الحقيقية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {hotelBookings?.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">إجمالي الحجوزات</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {customers?.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">إجمالي العملاء</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {financialData?.revenue.toLocaleString() || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">الإيرادات (ج.م)</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold text-primary">
                        {financialData?.profitMargin.toFixed(1) || 0}%
                      </div>
                      <div className="text-sm text-muted-foreground">هامش الربح</div>
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
