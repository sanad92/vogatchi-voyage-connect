
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Plus, Eye, Edit, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_NAMES } from "@/types/currency";

const BankAccounts = () => {
  const [newAccount, setNewAccount] = useState({
    account_name: "",
    bank_name: "",
    account_number: "",
    currency: "EGP",
    account_type: "checking",
    current_balance: 0,
    notes: ""
  });
  const [showForm, setShowForm] = useState(false);
  const { bankAccounts, transactions, isLoading, addBankAccount, isAddingAccount } = useBankAccounts();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.account_name || !newAccount.bank_name || !newAccount.account_number) {
      return;
    }
    addBankAccount(newAccount);
    setNewAccount({
      account_name: "",
      bank_name: "",
      account_number: "",
      currency: "EGP",
      account_type: "checking",
      current_balance: 0,
      notes: ""
    });
    setShowForm(false);
  };

  // إحصائيات الحسابات
  const totalBalance = bankAccounts.reduce((sum, account) => sum + account.current_balance, 0);
  const accountsByCurrency = SUPPORTED_CURRENCIES.map(currency => ({
    currency,
    accounts: bankAccounts.filter(acc => acc.currency === currency),
    totalBalance: bankAccounts
      .filter(acc => acc.currency === currency)
      .reduce((sum, acc) => sum + acc.current_balance, 0)
  }));

  const getAccountTypeLabel = (type: string) => {
    const types = {
      checking: "حساب جاري",
      savings: "حساب توفير",
      credit: "حساب ائتماني"
    };
    return types[type as keyof typeof types] || type;
  };

  const getTransactionIcon = (type: string) => {
    return type === 'credit' ? <TrendingUp className="w-4 h-4 text-green-600" /> : <TrendingDown className="w-4 h-4 text-red-600" />;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-900 flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            الحسابات البنكية
          </h1>
          <p className="text-gray-600 mt-1">إدارة الحسابات البنكية متعددة العملات</p>
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 ml-2" />
              إضافة حساب بنكي
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>إضافة حساب بنكي جديد</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="account_name">اسم الحساب</Label>
                <Input
                  id="account_name"
                  value={newAccount.account_name}
                  onChange={e => setNewAccount({...newAccount, account_name: e.target.value})}
                  placeholder="الحساب الجاري الرئيسي"
                  required
                />
              </div>

              <div>
                <Label htmlFor="bank_name">اسم البنك</Label>
                <Input
                  id="bank_name"
                  value={newAccount.bank_name}
                  onChange={e => setNewAccount({...newAccount, bank_name: e.target.value})}
                  placeholder="البنك الأهلي المصري"
                  required
                />
              </div>

              <div>
                <Label htmlFor="account_number">رقم الحساب</Label>
                <Input
                  id="account_number"
                  value={newAccount.account_number}
                  onChange={e => setNewAccount({...newAccount, account_number: e.target.value})}
                  placeholder="1234567890123"
                  required
                />
              </div>

              <div>
                <Label htmlFor="currency">العملة</Label>
                <Select value={newAccount.currency} onValueChange={(value) => setNewAccount({...newAccount, currency: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_CURRENCIES.map(currency => (
                      <SelectItem key={currency} value={currency}>
                        {CURRENCY_NAMES[currency]} ({CURRENCY_SYMBOLS[currency]})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="account_type">نوع الحساب</Label>
                <Select value={newAccount.account_type} onValueChange={(value) => setNewAccount({...newAccount, account_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">حساب جاري</SelectItem>
                    <SelectItem value="savings">حساب توفير</SelectItem>
                    <SelectItem value="credit">حساب ائتماني</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="current_balance">الرصيد الحالي</Label>
                <Input
                  id="current_balance"
                  type="number"
                  step="0.01"
                  value={newAccount.current_balance}
                  onChange={e => setNewAccount({...newAccount, current_balance: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={newAccount.notes}
                  onChange={e => setNewAccount({...newAccount, notes: e.target.value})}
                  placeholder="ملاحظات إضافية..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isAddingAccount} className="flex-1">
                  {isAddingAccount ? "جاري الإضافة..." : "إضافة الحساب"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">إجمالي الحسابات</p>
                <p className="text-2xl font-bold">{bankAccounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {accountsByCurrency.map(({ currency, accounts, totalBalance }) => (
          <Card key={currency}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">إجمالي {CURRENCY_NAMES[currency]}</p>
                  <p className="text-2xl font-bold">
                    {totalBalance.toFixed(2)} {CURRENCY_SYMBOLS[currency]}
                  </p>
                  <p className="text-xs text-gray-500">{accounts.length} حساب</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* قائمة الحسابات البنكية */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full text-center py-8">جاري تحميل الحسابات البنكية...</div>
        ) : bankAccounts.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد حسابات بنكية مضافة</p>
              <Button onClick={() => setShowForm(true)} className="mt-4">
                إضافة أول حساب بنكي
              </Button>
            </CardContent>
          </Card>
        ) : (
          bankAccounts.map((account) => (
            <Card key={account.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{account.account_name}</CardTitle>
                    <p className="text-sm text-gray-600">{account.bank_name}</p>
                  </div>
                  <Badge variant="outline" className="ml-2">
                    {CURRENCY_SYMBOLS[account.currency as keyof typeof CURRENCY_SYMBOLS]} {account.currency}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">الرصيد الحالي</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {account.current_balance.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {CURRENCY_SYMBOLS[account.currency as keyof typeof CURRENCY_SYMBOLS]} {account.currency}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">رقم الحساب:</span>
                      <p className="text-gray-600">{account.account_number}</p>
                    </div>
                    <div>
                      <span className="font-medium">نوع الحساب:</span>
                      <p className="text-gray-600">{getAccountTypeLabel(account.account_type)}</p>
                    </div>
                  </div>

                  {account.notes && (
                    <div className="p-3 bg-blue-50 rounded">
                      <span className="font-medium text-blue-800">ملاحظات:</span>
                      <p className="text-sm text-blue-700 mt-1">{account.notes}</p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="w-4 h-4 mr-1" />
                      عرض
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      تعديل
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* آخر المعاملات */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>آخر المعاملات البنكية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.slice(0, 5).map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    {getTransactionIcon(transaction.transaction_type)}
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-gray-600">
                        {transaction.bank_accounts?.account_name} • {new Date(transaction.transaction_date).toLocaleDateString('ar-EG')}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className={`font-bold ${transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.transaction_type === 'credit' ? '+' : '-'}{transaction.amount.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {CURRENCY_SYMBOLS[transaction.bank_accounts?.currency as keyof typeof CURRENCY_SYMBOLS]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BankAccounts;
