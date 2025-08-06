
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, 
  Receipt, 
  Home, 
  Calculator, 
  PieChart, 
  TrendingUp,
  Settings,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import ExpenseOverview from '@/components/expenses/ExpenseOverview';
import EmployeeManagement from '@/components/expenses/EmployeeManagement';
import ExpenseTransactions from '@/components/expenses/ExpenseTransactions';
import RentManagement from '@/components/expenses/RentManagement';
import SalaryManagementImproved from '@/components/expenses/salary/SalaryManagementImproved';
import EnhancedExpenseReports from '@/components/expenses/reports/EnhancedExpenseReports';
import CommissionManagement from '@/components/expenses/CommissionManagement';
import ExchangeRateManager from '@/components/currency/ExchangeRateManager';

const ExpenseManagementEnhanced = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة المصروفات والحسابات المحسّنة</h1>
          <p className="text-muted-foreground mt-2">
            نظام شامل لإدارة المصروفات مع دعم العملات المتعددة والتقارير المتقدمة
          </p>
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          النظام المحسّن يدعم العملات المتعددة مع تحويل تلقائي إلى الجنيه المصري.
          جميع الحسابات والتقارير محسوبة بدقة مع أسعار الصرف المحدثة.
        </AlertDescription>
      </Alert>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">نظرة عامة</span>
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">الموظفين</span>
          </TabsTrigger>
          <TabsTrigger value="salaries" className="flex items-center gap-2">
            <Calculator className="h-4 w-4" />
            <span className="hidden sm:inline">الرواتب</span>
          </TabsTrigger>
          <TabsTrigger value="commissions" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">العمولات</span>
          </TabsTrigger>
          <TabsTrigger value="rent" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">الإيجارات</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">المصروفات</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">التقارير</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">الإعدادات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <ExpenseOverview />
        </TabsContent>

        <TabsContent value="employees">
          <EmployeeManagement />
        </TabsContent>

        <TabsContent value="salaries">
          <SalaryManagementImproved />
        </TabsContent>

        <TabsContent value="commissions">
          <CommissionManagement />
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
