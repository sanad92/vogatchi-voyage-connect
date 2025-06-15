
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Building2, CreditCard, TrendingUp, TrendingDown, Eye, EyeOff } from 'lucide-react';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS } from '@/types/currency';
import { useToast } from '@/hooks/use-toast';

const BankAccountManagement = () => {
  const { bankAccounts, transactions, isLoading, addBankAccount, addTransaction } = useBankAccounts();
  const { toast } = useToast();
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showBalances, setShowBalances] = useState(false);
  const [newAccount, setNewAccount] = useState({
    account_name: '',
    bank_name: '',
    account_number: '',
    currency: 'SAR',
    account_type: 'checking',
    current_balance: 0
  });

  const handleAddAccount = async () => {
    if (!newAccount.account_name || !newAccount.bank_name || !newAccount.account_number) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    addBankAccount({
      ...newAccount,
      is_active: true,
      notes: undefined
    });

    setNewAccount({
      account_name: '',
      bank_name: '',
      account_number: '',
      currency: 'SAR',
      account_type: 'checking',
      current_balance: 0
    });
    setShowAddAccount(false);
  };

  // حساب إجمالي الأرصدة بكل عملة
  const getTotalBalancesByCurrency = () => {
    const balances: { [key: string]: number } = {};
    bankAccounts.forEach(account => {
      if (!balances[account.currency]) {
        balances[account.currency] = 0;
      }
      balances[account.currency] += account.current_balance;
    });
    return balances;
  };

  const totalBalances = getTotalBalancesByCurrency();

  if (isLoading) return <div className="text-center p-8">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      {/* ملخص الأرصدة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الحسابات</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bankAccounts.length}</div>
            <p className="text-xs text-muted-foreground">حساب نشط</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العملات المتاحة</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(totalBalances).length}</div>
            <p className="text-xs text-muted-foreground">عملة مختلفة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الأرصدة الإجمالية</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
              className="h-4 w-4 p-0"
            >
              {showBalances ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </CardHeader>
          <CardContent>
            {showBalances ? (
              <div className="space-y-1">
                {Object.entries(totalBalances).map(([currency, balance]) => (
                  <div key={currency} className="text-sm">
                    <span className="font-medium">{balance.toLocaleString()}</span> {CURRENCY_SYMBOLS[currency as keyof typeof CURRENCY_SYMBOLS]}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-lg">•••••••</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* إضافة حساب جديد */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>إدارة الحسابات البنكية</CardTitle>
            <Button onClick={() => setShowAddAccount(!showAddAccount)}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة حساب جديد
            </Button>
          </div>
        </CardHeader>
        {showAddAccount && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم الحساب</label>
                <Input
                  value={newAccount.account_name}
                  onChange={(e) => setNewAccount({...newAccount, account_name: e.target.value})}
                  placeholder="مثال: الحساب الجاري الرئيسي"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">اسم البنك</label>
                <Input
                  value={newAccount.bank_name}
                  onChange={(e) => setNewAccount({...newAccount, bank_name: e.target.value})}
                  placeholder="مثال: البنك الأهلي السعودي"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">رقم الحساب</label>
                <Input
                  value={newAccount.account_number}
                  onChange={(e) => setNewAccount({...newAccount, account_number: e.target.value})}
                  placeholder="رقم الحساب البنكي"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">العملة</label>
                <Select value={newAccount.currency} onValueChange={(value) => setNewAccount({...newAccount, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map(currency => (
                      <SelectItem key={currency} value={currency}>
                        {currency} - {CURRENCY_SYMBOLS[currency]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">نوع الحساب</label>
                <Select value={newAccount.account_type} onValueChange={(value) => setNewAccount({...newAccount, account_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">حساب جاري</SelectItem>
                    <SelectItem value="savings">حساب توفير</SelectItem>
                    <SelectItem value="business">حساب تجاري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">الرصيد الابتدائي</label>
                <Input
                  type="number"
                  value={newAccount.current_balance}
                  onChange={(e) => setNewAccount({...newAccount, current_balance: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddAccount}>إضافة الحساب</Button>
              <Button variant="outline" onClick={() => setShowAddAccount(false)}>إلغاء</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* قائمة الحسابات البنكية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankAccounts.map((account) => (
          <Card key={account.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{account.account_name}</CardTitle>
                <Badge variant="secondary">{account.currency}</Badge>
              </div>
              <p className="text-sm text-gray-600">{account.bank_name}</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">رقم الحساب:</span>
                  <span className="text-sm font-mono">
                    {account.account_number.slice(-4).padStart(account.account_number.length, '*')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">نوع الحساب:</span>
                  <span className="text-sm capitalize">
                    {account.account_type === 'checking' ? 'جاري' : 
                     account.account_type === 'savings' ? 'توفير' : 'تجاري'}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm font-medium">الرصيد الحالي:</span>
                  <span className="text-lg font-bold text-green-600">
                    {showBalances ? 
                      `${account.current_balance.toLocaleString()} ${CURRENCY_SYMBOLS[account.currency as keyof typeof CURRENCY_SYMBOLS]}` : 
                      '•••••••'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bankAccounts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد حسابات بنكية</h3>
            <p className="text-gray-500 mb-4">ابدأ بإضافة حسابك البنكي الأول</p>
            <Button onClick={() => setShowAddAccount(true)}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة حساب بنكي
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BankAccountManagement;
