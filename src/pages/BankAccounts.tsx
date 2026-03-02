
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CreditCard, RefreshCw, BarChart3 } from 'lucide-react';
import BankAccountManagement from '@/components/currency/BankAccountManagement';
import BankTransactionManager from '@/components/currency/BankTransactionManager';
import ExchangeRateManager from '@/components/currency/ExchangeRateManager';
import CurrencyConverter from '@/components/currency/CurrencyConverter';
import BreadcrumbNav from '@/components/ui/breadcrumb-nav';

const BankAccounts = () => {
  const [activeTab, setActiveTab] = useState('accounts');

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <BreadcrumbNav items={[
        { label: 'الرئيسية', href: '/dashboard' },
        { label: 'الحسابات البنكية' }
      ]} />
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">إدارة الحسابات البنكية والعملات</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max sm:w-full sm:grid sm:grid-cols-4 gap-1">
            <TabsTrigger value="accounts" className="flex items-center gap-1.5 whitespace-nowrap px-3">
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">الحسابات البنكية</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-1.5 whitespace-nowrap px-3">
              <CreditCard className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">الحركات البنكية</span>
            </TabsTrigger>
            <TabsTrigger value="exchange-rates" className="flex items-center gap-1.5 whitespace-nowrap px-3">
              <RefreshCw className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">أسعار الصرف</span>
            </TabsTrigger>
            <TabsTrigger value="converter" className="flex items-center gap-1.5 whitespace-nowrap px-3">
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">محول العملات</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="accounts">
          <BankAccountManagement />
        </TabsContent>

        <TabsContent value="transactions">
          <BankTransactionManager />
        </TabsContent>

        <TabsContent value="exchange-rates">
          <ExchangeRateManager />
        </TabsContent>

        <TabsContent value="converter">
          <CurrencyConverter />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BankAccounts;
