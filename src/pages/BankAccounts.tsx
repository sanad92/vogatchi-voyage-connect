
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, CreditCard, RefreshCw, BarChart3 } from 'lucide-react';
import BankAccountManagement from '@/components/currency/BankAccountManagement';
import BankTransactionManager from '@/components/currency/BankTransactionManager';
import ExchangeRateManager from '@/components/currency/ExchangeRateManager';
import CurrencyConverter from '@/components/currency/CurrencyConverter';

const BankAccounts = () => {
  const [activeTab, setActiveTab] = useState('accounts');

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">إدارة الحسابات البنكية والعملات</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="hidden sm:inline">الحسابات البنكية</span>
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">الحركات البنكية</span>
          </TabsTrigger>
          <TabsTrigger value="exchange-rates" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">أسعار الصرف</span>
          </TabsTrigger>
          <TabsTrigger value="converter" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">محول العملات</span>
          </TabsTrigger>
        </TabsList>

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
