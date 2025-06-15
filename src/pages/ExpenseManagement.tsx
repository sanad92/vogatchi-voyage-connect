
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Receipt, Home, Calendar, PieChart, TrendingUp } from 'lucide-react';
import ExpenseOverview from '@/components/expenses/ExpenseOverview';
import EmployeeManagement from '@/components/expenses/EmployeeManagement';
import ExpenseTransactions from '@/components/expenses/ExpenseTransactions';
import RentManagement from '@/components/expenses/RentManagement';
import SalaryManagement from '@/components/expenses/SalaryManagement';
import ExpenseReports from '@/components/expenses/ExpenseReports';

const ExpenseManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة المصروفات والحسابات</h1>
          <p className="text-gray-600 mt-2">جميع المبالغ والحسابات بالجنيه المصري (ج.م)</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">نظرة عامة</span>
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">الموظفين</span>
          </TabsTrigger>
          <TabsTrigger value="salaries" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
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
        </TabsList>

        <TabsContent value="overview">
          <ExpenseOverview />
        </TabsContent>

        <TabsContent value="employees">
          <EmployeeManagement />
        </TabsContent>

        <TabsContent value="salaries">
          <SalaryManagement />
        </TabsContent>

        <TabsContent value="rent">
          <RentManagement />
        </TabsContent>

        <TabsContent value="expenses">
          <ExpenseTransactions />
        </TabsContent>

        <TabsContent value="reports">
          <ExpenseReports />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpenseManagement;
