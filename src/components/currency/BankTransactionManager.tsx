
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownLeft, Plus, Filter } from 'lucide-react';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { CURRENCY_SYMBOLS } from '@/types/currency';
import { useToast } from '@/hooks/use-toast';

const BankTransactionManager = () => {
  const { bankAccounts, transactions, addTransaction } = useBankAccounts();
  const { toast } = useToast();
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    bank_account_id: '',
    transaction_type: 'credit' as 'credit' | 'debit',
    amount: 0,
    description: '',
    reference_number: '',
    transaction_date: new Date().toISOString().split('T')[0]
  });

  const handleAddTransaction = async () => {
    if (!newTransaction.bank_account_id || !newTransaction.amount || !newTransaction.description) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    addTransaction(newTransaction);

    setNewTransaction({
      bank_account_id: '',
      transaction_type: 'credit',
      amount: 0,
      description: '',
      reference_number: '',
      transaction_date: new Date().toISOString().split('T')[0]
    });
    setShowAddTransaction(false);
  };

  // تجميع المعاملات حسب الحساب
  const getTransactionsByAccount = (accountId: string) => {
    return transactions.filter(t => t.bank_account_id === accountId).slice(0, 5);
  };

  return (
    <div className="space-y-6">
      {/* إضافة معاملة جديدة */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>إدارة الحركات البنكية</CardTitle>
            <Button onClick={() => setShowAddTransaction(!showAddTransaction)}>
              <Plus className="h-4 w-4 mr-2" />
              إضافة حركة بنكية
            </Button>
          </div>
        </CardHeader>
        {showAddTransaction && (
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الحساب البنكي</label>
                <Select value={newTransaction.bank_account_id} onValueChange={(value) => setNewTransaction({...newTransaction, bank_account_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب البنكي" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(account => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} - {account.currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">نوع المعاملة</label>
                <Select value={newTransaction.transaction_type} onValueChange={(value: 'credit' | 'debit') => setNewTransaction({...newTransaction, transaction_type: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit">إيداع (+)</SelectItem>
                    <SelectItem value="debit">سحب (-)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">المبلغ</label>
                <Input
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({...newTransaction, amount: parseFloat(e.target.value) || 0})}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">تاريخ المعاملة</label>
                <Input
                  type="date"
                  value={newTransaction.transaction_date}
                  onChange={(e) => setNewTransaction({...newTransaction, transaction_date: e.target.value})}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-sm font-medium">الوصف</label>
                <Textarea
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  placeholder="وصف المعاملة..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">رقم المرجع (اختياري)</label>
                <Input
                  value={newTransaction.reference_number}
                  onChange={(e) => setNewTransaction({...newTransaction, reference_number: e.target.value})}
                  placeholder="رقم المرجع"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddTransaction}>إضافة المعاملة</Button>
              <Button variant="outline" onClick={() => setShowAddTransaction(false)}>إلغاء</Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* عرض المعاملات حسب الحساب */}
      <div className="space-y-4">
        {bankAccounts.map((account) => {
          const accountTransactions = getTransactionsByAccount(account.id);
          return (
            <Card key={account.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{account.account_name}</CardTitle>
                    <p className="text-sm text-gray-500">{account.bank_name}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      {account.current_balance.toLocaleString()} {CURRENCY_SYMBOLS[account.currency as keyof typeof CURRENCY_SYMBOLS]}
                    </div>
                    <Badge variant="secondary">{account.currency}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {accountTransactions.length > 0 ? (
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm text-gray-700">آخر المعاملات</h4>
                    {accountTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          {transaction.transaction_type === 'credit' ? (
                            <ArrowDownLeft className="h-4 w-4 text-green-600" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-red-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{transaction.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.transaction_date).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-medium ${transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.transaction_type === 'credit' ? '+' : '-'}{transaction.amount.toLocaleString()}
                          </p>
                          {transaction.reference_number && (
                            <p className="text-xs text-gray-500">#{transaction.reference_number}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    لا توجد معاملات لهذا الحساب
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {bankAccounts.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">يجب إضافة حساب بنكي أولاً لإدارة المعاملات</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BankTransactionManager;
