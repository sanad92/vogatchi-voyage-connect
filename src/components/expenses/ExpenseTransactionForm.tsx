
import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExpenses } from '@/hooks/useExpenses';
import { SupportedCurrency } from '@/types/currency';
import CurrencySelector from '@/components/currency/CurrencySelector';
import PaymentMethodSelector from './PaymentMethodSelector';

interface ExpenseTransactionFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
  isSubmitting?: boolean;
}

const ExpenseTransactionForm = ({ 
  onSubmit, 
  onCancel, 
  initialData, 
  isSubmitting = false 
}: ExpenseTransactionFormProps) => {
  const { expenseCategories } = useExpenses();
  
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: {
      description: initialData?.description || '',
      amount: initialData?.amount || '',
      category_id: initialData?.category_id || '',
      transaction_date: initialData?.transaction_date || new Date().toISOString().split('T')[0],
      currency: initialData?.currency || 'EGP' as SupportedCurrency,
      payment_method: initialData?.payment_method || 'cash',
      vendor_name: initialData?.vendor_name || '',
      vendor_phone: initialData?.vendor_phone || '',
      invoice_number: initialData?.invoice_number || '',
      notes: initialData?.notes || ''
    }
  });

  const selectedCurrency = watch('currency');

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? 'تعديل معاملة مصروفات' : 'إضافة معاملة مصروفات جديدة'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="description">وصف المعاملة *</Label>
              <Input
                id="description"
                {...register('description', { required: 'وصف المعاملة مطلوب' })}
                placeholder="أدخل وصف المعاملة"
              />
              {errors.description && (
                <p className="text-red-500 text-sm mt-1">{errors.description.message as string}</p>
              )}
            </div>

            <div>
              <Label htmlFor="category_id">فئة المصروفات *</Label>
              <Select onValueChange={(value) => setValue('category_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر فئة المصروفات" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-red-500 text-sm mt-1">يجب اختيار فئة المصروفات</p>
              )}
            </div>

            <div>
              <Label htmlFor="amount">المبلغ *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                {...register('amount', { 
                  required: 'المبلغ مطلوب',
                  min: { value: 0.01, message: 'المبلغ يجب أن يكون أكبر من صفر' }
                })}
                placeholder="أدخل المبلغ"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount.message as string}</p>
              )}
            </div>

            <div>
              <Label htmlFor="currency">العملة</Label>
              <CurrencySelector
                value={selectedCurrency}
                onValueChange={(value) => setValue('currency', value)}
              />
            </div>

            <div>
              <Label htmlFor="transaction_date">تاريخ المعاملة *</Label>
              <Input
                id="transaction_date"
                type="date"
                {...register('transaction_date', { required: 'تاريخ المعاملة مطلوب' })}
              />
              {errors.transaction_date && (
                <p className="text-red-500 text-sm mt-1">{errors.transaction_date.message as string}</p>
              )}
            </div>

            <div>
              <Label htmlFor="payment_method">طريقة الدفع</Label>
              <PaymentMethodSelector
                value={watch('payment_method')}
                onChange={(value) => setValue('payment_method', value)}
              />
            </div>

            <div>
              <Label htmlFor="vendor_name">اسم المورد</Label>
              <Input
                id="vendor_name"
                {...register('vendor_name')}
                placeholder="اسم المورد (اختياري)"
              />
            </div>

            <div>
              <Label htmlFor="vendor_phone">هاتف المورد</Label>
              <Input
                id="vendor_phone"
                {...register('vendor_phone')}
                placeholder="رقم هاتف المورد (اختياري)"
              />
            </div>

            <div>
              <Label htmlFor="invoice_number">رقم الفاتورة</Label>
              <Input
                id="invoice_number"
                {...register('invoice_number')}
                placeholder="رقم الفاتورة (اختياري)"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">ملاحظات</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="أي ملاحظات إضافية (اختياري)"
              rows={3}
            />
          </div>

          <div className="flex gap-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : initialData ? 'تحديث' : 'إضافة'}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              إلغاء
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ExpenseTransactionForm;
