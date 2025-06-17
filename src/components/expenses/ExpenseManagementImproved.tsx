
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
  AlertCircle 
} from 'lucide-react';
import ExpenseOverview from './ExpenseOverview';
import EmployeeManagement from './EmployeeManagement';
import ExpenseTransactions from './ExpenseTransactions';
import RentManagement from './RentManagement';
import SalaryManagementImproved from './salary/SalaryManagementImproved';
import EnhancedExpenseReports from './reports/EnhancedExpenseReports';
import ExchangeRateManager from '@/components/currency/ExchangeRateManager';

const ExpenseManagementImproved = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة المصروفات والحسابات المحسّنة</h1>
          <p className="text-gray-600 mt-2">
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
        <TabsList className="grid w-full grid-cols-7">
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

export default ExpenseManagementImproved;
