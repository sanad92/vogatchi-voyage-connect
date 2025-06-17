
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DollarSign, Receipt, Building2, CreditCard, TrendingUp } from 'lucide-react';
import FinancialOverview from './FinancialOverview';
import ExpenseTransactions from './ExpenseTransactions';
import BankAccounts from './BankAccounts';
import RentContractsGrid from './RentContractsGrid';
import RentPaymentsList from './RentPaymentsList';

const FinancialTabs = () => {
  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-5">
        <TabsTrigger value="overview" className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">نظرة عامة</span>
        </TabsTrigger>
        <TabsTrigger value="expenses" className="flex items-center gap-2">
          <Receipt className="h-4 w-4" />
          <span className="hidden sm:inline">المصروفات</span>
        </TabsTrigger>
        <TabsTrigger value="rent-contracts" className="flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          <span className="hidden sm:inline">عقود الإيجار</span>
        </TabsTrigger>
        <TabsTrigger value="rent-payments" className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          <span className="hidden sm:inline">مدفوعات الإيجار</span>
        </TabsTrigger>
        <TabsTrigger value="accounts" className="flex items-center gap-2">
          <DollarSign className="h-4 w-4" />
          <span className="hidden sm:inline">الحسابات البنكية</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <FinancialOverview />
      </TabsContent>

      <TabsContent value="expenses">
        <ExpenseTransactions />
      </TabsContent>

      <TabsContent value="rent-contracts">
        <RentContractsGrid />
      </TabsContent>

      <TabsContent value="rent-payments">
        <RentPaymentsList />
      </TabsContent>

      <TabsContent value="accounts">
        <BankAccounts />
      </TabsContent>
    </Tabs>
  );
};

export default FinancialTabs;
