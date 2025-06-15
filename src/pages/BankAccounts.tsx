
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Edit, Trash2, DollarSign, TrendingUp, TrendingDown } from "lucide-react";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS, CURRENCY_NAMES } from "@/types/currency";

const BankAccounts = () => {
  const [showForm, setShowForm] = useState(false);
  const [newAccount, setNewAccount] = useState({
    account_name: "",
    bank_name: "",
    account_number: "",
    currency: "EGP",
    account_type: "checking",
    current_balance: 0,
    notes: "",
    is_active: true
  });

  const { bankAccounts, transactions, isLoading, addBankAccount, addTransaction, getAccountsByCurrency, isAddingAccount } = useBankAccounts();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addBankAccount(newAccount);
    setNewAccount({
      account_name: "",
      bank_name: "",
      account_number: "",
      currency: "EGP",
      account_type: "checking",
      current_balance: 0,
      notes: "",
      is_active: true
    });
    setShowForm(false);
  };

  const getTotalBalanceByCurrency = (currency: string) => {
    return bankAccounts
      .filter(account => account.currency === currency)
      .reduce((sum, account) => sum + account.current_balance, 0);
  };

  const getAccountTypeLabel = (type: string) => {
    const types = {
      checking: "حساب جاري",
      savings: "حساب توفير",
      business: "حساب تجاري",
      investment: "حساب استثماري"
    };
    return types[type as keyof typeof types] || type;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-orange-900 flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            الحسابات البنكية
          </h1>
          <p className="text-gray-600 mt-1">إدارة الحسابات البنكية متعددة العملات</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="w-4 h-4 ml-2" />
          إضافة حساب بنكي
        </Button>
      </div>

      {/* ملخص الأرصدة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SUPPORTED_CURRENCIES.map(currency => {
          const total = getTotalBalanceByCurrency(currency);
          return (
            <Card key={currency}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{CURRENCY_NAMES[currency]}</p>
                    <p className="text-2xl font-bold">
                      {total.toFixed(2)} {CURRENCY_SYMBOLS[currency]}
                    </p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>إضافة حساب بنكي جديد</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="اسم الحساب"
                value={newAccount.account_name}
                onChange={e => setNewAccount({...newAccount, account_name: e.target.value})}
                required
              />

              <Input
                placeholder="اسم البنك"
                value={newAccount.bank_name}
                onChange={e => setNewAccount({...newAccount, bank_name: e.target.value})}
                required
              />

              <Input
                placeholder="رقم الحساب"
                value={newAccount.account_number}
                onChange={e => setNewAccount({...newAccount, account_number: e.target.value})}
                required
              />

              <Select value={newAccount.currency} onValueChange={(value) => setNewAccount({...newAccount, currency: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="العملة" />
                </SelectTrigger>
                <SelectContent>
                  {SUPPORTED_CURRENCIES.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {CURRENCY_NAMES[currency]} ({CURRENCY_SYMBOLS[currency]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={newAccount.account_type} onValueChange={(value) => setNewAccount({...newAccount, account_type: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="نوع الحساب" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">حساب جاري</SelectItem>
                  <SelectItem value="savings">حساب توفير</SelectItem>
                  <SelectItem value="business">حساب تجاري</SelectItem>
                  <SelectItem value="investment">حساب استثماري</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="number"
                placeholder="الرصيد الافتتاحي"
                value={newAccount.current_balance}
                onChange={e => setNewAccount({...newAccount, current_balance: parseFloat(e.target.value) || 0})}
                step="0.01"
              />

              <div className="md:col-span-2">
                <Textarea
                  placeholder="ملاحظات (اختياري)"
                  value={newAccount.notes}
                  onChange={e => setNewAccount({...newAccount, notes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={isAddingAccount}>
                  {isAddingAccount ? "جاري الإضافة..." : "إضافة الحساب"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* قائمة الحسابات البنكية */}
      <div className="grid grid-cols-1 gap-4">
        {isLoading ? (
          <div className="text-center py-8">جاري تحميل الحسابات البنكية...</div>
        ) : bankAccounts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">لا توجد حسابات بنكية مضافة بعد</p>
            </CardContent>
          </Card>
        ) : (
          bankAccounts.map((account) => (
            <Card key={account.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Building2 className="w-5 h-5" />
                      {account.account_name}
                    </h3>
                    <p className="text-gray-600">{account.bank_name}</p>
                    <p className="text-sm text-gray-500">رقم الحساب: {account.account_number}</p>
                  </div>
                  <div className="text-left">
                    <Badge variant="secondary" className="mb-2">
                      {getAccountTypeLabel(account.account_type)}
                    </Badge>
                    <div className="text-2xl font-bold text-green-600">
                      {account.current_balance.toFixed(2)} {CURRENCY_SYMBOLS[account.currency as keyof typeof CURRENCY_SYMBOLS]}
                    </div>
                    <div className="text-sm text-gray-600">
                      {CURRENCY_NAMES[account.currency as keyof typeof CURRENCY_NAMES]}
                    </div>
                  </div>
                </div>

                {account.notes && (
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <span className="font-medium">ملاحظات:</span>
                    <p className="text-sm mt-1">{account.notes}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Edit className="w-4 h-4 mr-1" />
                    تعديل
                  </Button>
                  <Button size="sm" variant="outline">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    إيداع
                  </Button>
                  <Button size="sm" variant="outline">
                    <TrendingDown className="w-4 h-4 mr-1" />
                    سحب
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default BankAccounts;
