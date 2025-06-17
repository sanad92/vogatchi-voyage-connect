
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, CreditCard, TrendingUp } from 'lucide-react';
import { useFinancialData } from '@/hooks/useFinancialData';

const BankAccounts = () => {
  const { bankAccounts, bankTransactions, exchangeRates } = useFinancialData();

  const convertToEGP = (amount: number, currency: string) => {
    if (currency === 'EGP') return amount;
    const rate = exchangeRates?.find(r => r.from_currency === currency && r.to_currency === 'EGP')?.rate || 1;
    return amount * rate;
  };

  const getAccountTypeText = (type: string) => {
    switch (type) {
      case 'checking': return 'جاري';
      case 'savings': return 'توفير';
      case 'credit': return 'ائتمان';
      default: return type;
    }
  };

  const getRecentTransactions = (accountId: string) => {
    return bankTransactions?.filter(t => t.bank_account_id === accountId)
      .slice(0, 3) || [];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">الحسابات البنكية</h2>
        <Button>
          <CreditCard className="h-4 w-4 mr-2" />
          إضافة حساب
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {bankAccounts?.map((account) => {
          const recentTransactions = getRecentTransactions(account.id);
          const egpBalance = convertToEGP(account.current_balance, account.currency);
          
          return (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {account.account_name}
                  </CardTitle>
                  <Badge variant="outline">
                    {getAccountTypeText(account.account_type)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600">{account.bank_name}</div>
                  <div className="text-xs font-mono text-gray-500">
                    {account.account_number}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">الرصيد الحالي:</span>
                    <div className="text-right">
                      <div className="font-bold text-lg">
                        {account.current_balance.toLocaleString()} {account.currency}
                      </div>
                      {account.currency !== 'EGP' && (
                        <div className="text-xs text-gray-500">
                          ≈ {egpBalance.toLocaleString()} ج.م
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium">آخر المعاملات</span>
                    <Button variant="ghost" size="sm">
                      عرض الكل
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    {recentTransactions.length > 0 ? recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center text-sm">
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(transaction.transaction_date).toLocaleDateString('ar-EG')}
                          </div>
                        </div>
                        <div className={`font-medium ${
                          transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {transaction.transaction_type === 'credit' ? '+' : '-'}
                          {transaction.amount.toLocaleString()}
                        </div>
                      </div>
                    )) : (
                      <div className="text-sm text-gray-500 text-center py-4">
                        لا توجد معاملات حديثة
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    عرض التفاصيل
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    إضافة معاملة
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BankAccounts;
