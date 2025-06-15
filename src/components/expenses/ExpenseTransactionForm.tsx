
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { ExpenseTransaction, ExpenseCategory } from '@/types/expenses';
import PaymentMethodSelector from '@/components/expenses/PaymentMethodSelector';

interface ExpenseTransactionFormProps {
  expenseCategories: ExpenseCategory[] | undefined;
  onSubmit: (transaction: Omit<ExpenseTransaction, 'id' | 'created_at' | 'updated_at' | 'transaction_number'>) => void;
  isSubmitting: boolean;
  onCancel: () => void;
}

const ExpenseTransactionForm = ({ 
  expenseCategories, 
  onSubmit, 
  isSubmitting, 
  onCancel 
}: ExpenseTransactionFormProps) => {
  const [newTransaction, setNewTransaction] = useState<Omit<ExpenseTransaction, 'id' | 'created_at' | 'updated_at' | 'transaction_number'>>({
    category_id: '',
    description: '',
    amount: 0,
    currency: 'EGP',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    bank_account_id: '',
    vendor_name: '',
    vendor_phone: '',
    invoice_number: '',
    receipt_url: '',
    status: 'pending',
    approved_by: '',
    approved_at: '',
    created_by: '',
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.category_id || !newTransaction.description || !newTransaction.amount) {
      return;
    }

    onSubmit(newTransaction);
    setNewTransaction({
      category_id: '',
      description: '',
      amount: 0,
      currency: 'EGP',
      transaction_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      bank_account_id: '',
      vendor_name: '',
      vendor_phone: '',
      invoice_number: '',
      receipt_url: '',
      status: 'pending',
      approved_by: '',
      approved_at: '',
      created_by: '',
      notes: '',
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category_id">فئة المصروف *</Label>
          <Select 
            value={newTransaction.category_id} 
            onValueChange={(value) => setNewTransaction({ ...newTransaction, category_id: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="اختر فئة المصروف" />
            </SelectTrigger>
            <SelectContent>
              {expenseCategories?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name_ar}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="amount">المبلغ (ج.م) *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            value={newTransaction.amount}
            onChange={(e) => setNewTransaction({ ...newTransaction, amount: Number(e.target.value) })}
            placeholder="0.00"
            required
          />
        </div>
        
        <div className="md:col-span-2">
          <Label htmlFor="description">وصف المصروف *</Label>
          <Input
            id="description"
            value={newTransaction.description}
            onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
            placeholder="أدخل وصف المصروف"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="transaction_date">تاريخ المصروف</Label>
          <Input
            id="transaction_date"
            type="date"
            value={newTransaction.transaction_date}
            onChange={(e) => setNewTransaction({ ...newTransaction, transaction_date: e.target.value })}
          />
        </div>
        
        <div>
          <PaymentMethodSelector
            value={newTransaction.payment_method}
            onChange={(value) => setNewTransaction({ ...newTransaction, payment_method: value })}
            label="طريقة الدفع"
          />
        </div>
        
        <div>
          <Label htmlFor="vendor_name">اسم المورد/الجهة</Label>
          <Input
            id="vendor_name"
            value={newTransaction.vendor_name}
            onChange={(e) => setNewTransaction({ ...newTransaction, vendor_name: e.target.value })}
            placeholder="اسم المورد أو الجهة"
          />
        </div>
        
        <div>
          <Label htmlFor="invoice_number">رقم الفاتورة</Label>
          <Input
            id="invoice_number"
            value={newTransaction.invoice_number}
            onChange={(e) => setNewTransaction({ ...newTransaction, invoice_number: e.target.value })}
            placeholder="رقم الفاتورة"
          />
        </div>
        
        <div className="md:col-span-2">
          <Label htmlFor="notes">ملاحظات</Label>
          <Textarea
            id="notes"
            value={newTransaction.notes}
            onChange={(e) => setNewTransaction({ ...newTransaction, notes: e.target.value })}
            placeholder="أي ملاحظات إضافية"
          />
        </div>
      </div>
      
      <div className="flex gap-2 pt-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'جاري الحفظ...' : 'حفظ المصروف'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
};

export default ExpenseTransactionForm;
