
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit2 } from 'lucide-react';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { BankAccount, SupportedCurrency } from '@/types/currency';
import CurrencySelector from './CurrencySelector';
import MultiCurrencyDisplay from './MultiCurrencyDisplay';
import { Badge } from '@/components/ui/badge';

interface BankAccountFormValues {
  account_name: string;
  bank_name: string;
  account_number: string;
  currency: SupportedCurrency;
  account_type: 'checking' | 'savings' | 'business';
  current_balance: number;
  notes?: string;
}

const BankAccountManagement = () => {
  const { bankAccounts, addBankAccount, isAddingAccount } = useBankAccounts();
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<BankAccountFormValues>({
    defaultValues: {
      account_name: '',
      bank_name: '',
      account_number: '',
      currency: 'EGP' as SupportedCurrency,
      account_type: 'checking',
      current_balance: 0,
      notes: ''
    }
  });

  const selectedCurrency = watch('currency');
  const selectedAccountType = watch('account_type');

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setShowForm(true);
    setValue('account_name', account.account_name);
    setValue('bank_name', account.bank_name);
    setValue('account_number', account.account_number);
    setValue('currency', account.currency as SupportedCurrency);
    setValue('account_type', account.account_type as 'checking' | 'savings' | 'business');
    setValue('current_balance', account.current_balance);
    setValue('notes', account.notes || '');
  };

  const onSubmit = async (data: any) => {
    try {
      await addBankAccount({
        ...data,
        currency: selectedCurrency
      });
      
      setShowForm(false);
      setEditingAccount(null);
      reset();
    } catch (error) {
      console.error('Error saving bank account:', error);
    }
  };

  if (!bankAccounts) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">إدارة الحسابات البنكية</h2>
          <p className="text-gray-600">إدارة حسابات البنوك بالعملات المختلفة - الجنيه المصري كعملة أساسية</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          إضافة حساب جديد
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingAccount ? 'تعديل حساب بنكي' : 'إضافة حساب بنكي جديد'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="account_name">اسم الحساب *</Label>
                  <Input
                    id="account_name"
                    {...register('account_name', { required: 'اسم الحساب مطلوب' })}
                    placeholder="اسم الحساب"
                  />
                  {errors.account_name && (
                    <p className="text-red-500 text-sm">{errors.account_name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="bank_name">اسم البنك *</Label>
                  <Input
                    id="bank_name"
                    {...register('bank_name', { required: 'اسم البنك مطلوب' })}
                    placeholder="اسم البنك"
                  />
                  {errors.bank_name && (
                    <p className="text-red-500 text-sm">{errors.bank_name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="account_number">رقم الحساب *</Label>
                  <Input
                    id="account_number"
                    {...register('account_number', { required: 'رقم الحساب مطلوب' })}
                    placeholder="رقم الحساب"
                  />
                  {errors.account_number && (
                    <p className="text-red-500 text-sm">{errors.account_number.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="currency">عملة الحساب</Label>
                  <CurrencySelector
                    value={selectedCurrency}
                    onValueChange={(value) => setValue('currency', value)}
                  />
                </div>

                <div>
                  <Label htmlFor="account_type">نوع الحساب</Label>
                  <Select value={selectedAccountType} onValueChange={(value: 'checking' | 'savings' | 'business') => setValue('account_type', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر نوع الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="checking">حساب جاري</SelectItem>
                      <SelectItem value="savings">حساب توفير</SelectItem>
                      <SelectItem value="business">حساب تجاري</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="current_balance">الرصيد الحالي</Label>
                  <Input
                    id="current_balance"
                    type="number"
                    step="0.01"
                    {...register('current_balance', { valueAsNumber: true })}
                    placeholder="الرصيد الحالي"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  placeholder="ملاحظات إضافية"
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={isAddingAccount}>
                  {isAddingAccount ? 'جاري الحفظ...' : editingAccount ? 'تحديث' : 'إضافة'}
                </Button>
                <Button type="button" variant="outline" onClick={() => {
                  setShowForm(false);
                  setEditingAccount(null);
                  reset();
                }}>
                  إلغاء
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* عرض الحسابات البنكية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bankAccounts?.map((account) => (
          <Card key={account.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>{account.account_name}</span>
                <Badge variant={account.is_active ? "default" : "secondary"}>
                  {account.is_active ? 'نشط' : 'غير نشط'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>البنك:</strong> {account.bank_name}</p>
                <p><strong>رقم الحساب:</strong> {account.account_number}</p>
                <p><strong>النوع:</strong> {
                  account.account_type === 'checking' ? 'حساب جاري' :
                  account.account_type === 'savings' ? 'حساب توفير' : 'حساب تجاري'
                }</p>
                <p><strong>الرصيد:</strong> 
                  <MultiCurrencyDisplay 
                    amount={account.current_balance} 
                    currency={account.currency as SupportedCurrency}
                    showInEGP={account.currency !== 'EGP'}
                  />
                </p>
                {account.notes && <p><strong>ملاحظات:</strong> {account.notes}</p>}
              </div>
              
              <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEdit(account)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bankAccounts?.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">لا توجد حسابات بنكية مسجلة</p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              إضافة أول حساب
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BankAccountManagement;
