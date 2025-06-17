
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, PieChart, BarChart3, FileText, AlertCircle } from 'lucide-react';
import ImprovedFinancialDashboard from './ImprovedFinancialDashboard';
import ExpenseAnalyticsChart from './ExpenseAnalyticsChart';
import CashFlowAnalysis from './CashFlowAnalysis';
import ExpenseReportExporter from './ExpenseReportExporter';

const EnhancedExpenseReports = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            التقارير المالية المحسّنة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              نظام التقارير المالية المحسّن مع دعم العملات المتعددة وتحليلات مالية متقدمة.
              جميع الحسابات محولة تلقائياً إلى الجنيه المصري لضمان الدقة.
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="dashboard" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                لوحة التحكم
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                التحليلات
              </TabsTrigger>
              <TabsTrigger value="cashflow" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                التدفق النقدي
              </TabsTrigger>
              <TabsTrigger value="export" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                التصدير
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="space-y-4">
              <ImprovedFinancialDashboard />
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <ExpenseAnalyticsChart />
            </TabsContent>

            <TabsContent value="cashflow" className="space-y-4">
              <CashFlowAnalysis />
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <ExpenseReportExporter />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedExpenseReports;
