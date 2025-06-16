
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Edit } from 'lucide-react';
import type { ExpenseTransaction } from '@/types/expenses';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useBankAccounts } from '@/hooks/useBankAccounts';

interface EditExpenseTransactionDialogProps {
  transaction: ExpenseTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (id: string, data: any) => Promise<void>;
  isSubmitting: boolean;
}

const EditExpenseTransactionDialog = ({ 
  transaction, 
  open, 
  onOpenChange, 
  onSubmit, 
  isSubmitting 
}: EditExpenseTransactionDialogProps) => {
  const { expenseCategories } = useExpenseCategories();
  const { bankAccounts } = useBankAccounts();

  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    category_id: '',
    transaction_date: '',
    payment_method: 'cash',
    vendor_name: '',
    vendor_phone: '',
    invoice_number: '',
    bank_account_id: '',
    notes: '',
  });

  useEffect(() => {
    if (transaction) {
      setFormData({
        description: transaction.description || '',
        amount: transaction.amount?.toString() || '',
        category_id: transaction.category_id || '',
        transaction_date: transaction.transaction_date || '',
        payment_method: transaction.payment_method || 'cash',
        vendor_name: transaction.vendor_name || '',
        vendor_phone: transaction.vendor_phone || '',
        invoice_number: transaction.invoice_number || '',
        bank_account_id: transaction.bank_account_id || '',
        notes: transaction.notes || '',
      });
    }
  }, [transaction]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    const submitData = {
      ...formData,
      amount: parseFloat(formData.amount),
      bank_account_id: formData.bank_account_id || null,
    };

    await onSubmit(transaction.id, submitData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            تعديل المعاملة المالية
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="description">الوصف *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="amount">المبلغ *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="category_id">الفئة *</Label>
              <Select value={formData.category_id} onValueChange={(value) => handleChange('category_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color }}
                        />
                        {category.name_ar}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="transaction_date">تاريخ المعاملة *</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => handleChange('transaction_date', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="payment_method">طريقة الدفع</Label>
              <Select value={formData.payment_method} onValueChange={(value) => handleChange('payment_method', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(formData.payment_method === 'bank_transfer' || formData.payment_method === 'check') && (
              <div>
                <Label htmlFor="bank_account_id">الحساب البنكي</Label>
                <Select value={formData.bank_account_id} onValueChange={(value) => handleChange('bank_account_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الحساب البنكي" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts?.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.account_name} - {account.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label htmlFor="vendor_name">اسم المورد</Label>
              <Input
                id="vendor_name"
                value={formData.vendor_name}
                onChange={(e) => handleChange('vendor_name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="vendor_phone">هاتف المورد</Label>
              <Input
                id="vendor_phone"
                value={formData.vendor_phone}
                onChange={(e) => handleChange('vendor_phone', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="invoice_number">رقم الفاتورة</Label>
              <Input
                id="invoice_number"
                value={formData.invoice_number}
                onChange={(e) => handleChange('invoice_number', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">الملاحظات</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditExpenseTransactionDialog;
