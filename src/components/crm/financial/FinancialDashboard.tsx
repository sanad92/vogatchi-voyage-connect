
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Receipt, Building2, TrendingUp } from 'lucide-react';
import FinancialOverview from './FinancialOverview';
import ExpenseTransactions from './ExpenseTransactions';
import BankAccounts from './BankAccounts';

const FinancialDashboard = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="h-8 w-8 text-green-600" />
            النظام المالي
          </h1>
          <p className="text-gray-600 mt-2">إدارة شاملة للمصروفات والحسابات البنكية</p>
        </div>
      </div>

      {/* نظرة عامة مالية */}
      <FinancialOverview />

      {/* التبويبات الرئيسية */}
      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="expenses" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            <span className="hidden sm:inline">المصروفات</span>
          </TabsTrigger>
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">الحسابات البنكية</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">التقارير</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <ExpenseTransactions />
        </TabsContent>

        <TabsContent value="accounts">
          <BankAccounts />
        </TabsContent>

        <TabsContent value="reports">
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">التقارير المالية</h3>
            <p className="text-gray-600">ستكون متاحة قريباً</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialDashboard;
