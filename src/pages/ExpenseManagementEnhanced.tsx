
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Receipt, 
  Home, 
  PieChart, 
  TrendingUp,
  Settings,
  AlertCircle,
} from 'lucide-react';
import ExpenseOverview from '@/components/expenses/ExpenseOverview';
import ExpenseTransactions from '@/components/expenses/ExpenseTransactions';
import RentManagement from '@/components/expenses/RentManagement';
import EnhancedExpenseReports from '@/components/expenses/reports/EnhancedExpenseReports';
import ExchangeRateManager from '@/components/currency/ExchangeRateManager';
import BreadcrumbNav from '@/components/ui/breadcrumb-nav';

const ExpenseManagementEnhanced = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <BreadcrumbNav items={[
        { label: 'الرئيسية', href: '/dashboard' },
        { label: 'إدارة المصروفات' }
      ]} />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">إدارة المصروفات والحسابات</h1>
        <p className="text-sm text-muted-foreground mt-1">
          نظام شامل لإدارة المصروفات مع دعم العملات المتعددة
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          النظام المحسّن يدعم العملات المتعددة مع تحويل تلقائي إلى الجنيه المصري.
          جميع الحسابات والتقارير محسوبة بدقة مع أسعار الصرف المحدثة.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max lg:w-full lg:grid lg:grid-cols-5 gap-1">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 whitespace-nowrap px-3">
              <PieChart className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">نظرة عامة</span>
            </TabsTrigger>
            <TabsTrigger value="rent" className="flex items-center gap-1.5 whitespace-nowrap px-3">
              <Home className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">الإيجارات</span>
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-1.5 whitespace-nowrap px-3">
              <Receipt className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">المصروفات</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-1.5 whitespace-nowrap px-3">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">التقارير</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 whitespace-nowrap px-3">
              <Settings className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">الإعدادات</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <ExpenseOverview />
        </TabsContent>

        <TabsContent value="rent">
          <RentManagement />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpenseTransactions />
        </TabsContent>

        <TabsContent value="reports">
          <EnhancedExpenseReports />
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                إعدادات النظام المالي
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ExchangeRateManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpenseManagementEnhanced;
