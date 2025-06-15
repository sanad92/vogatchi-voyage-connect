
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Receipt, Calendar, DollarSign } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import type { ExpenseTransaction } from '@/types/expenses';

const ExpenseTransactions = () => {
  const { 
    expenseTransactions, 
    expenseCategories, 
    addExpenseTransaction, 
    isAddingTransaction 
  } = useExpenses();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [newTransaction, setNewTransaction] = useState<Omit<ExpenseTransaction, 'id' | 'created_at' | 'updated_at' | 'transaction_number'>>({
    category_id: '',
    description: '',
    amount: 0,
    currency: 'SAR',
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

  const filteredTransactions = expenseTransactions?.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.transaction_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransaction.category_id || !newTransaction.description || !newTransaction.amount) {
      return;
    }

    addExpenseTransaction(newTransaction);
    setIsAddDialogOpen(false);
    setNewTransaction({
      category_id: '',
      description: '',
      amount: 0,
      currency: 'SAR',
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800">مدفوع</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800">معتمد</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">معلق</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">مرفوض</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">إدارة المصروفات</h2>
          <p className="text-gray-600">تسجيل ومتابعة جميع المصروفات العامة للشركة</p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إضافة مصروف جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة مصروف جديد</DialogTitle>
            </DialogHeader>
            
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
                  <Label htmlFor="amount">المبلغ *</Label>
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
                  <Label htmlFor="payment_method">طريقة الدفع</Label>
                  <Select 
                    value={newTransaction.payment_method} 
                    onValueChange={(value) => setNewTransaction({ ...newTransaction, payment_method: value })}
                  >
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
                <Button type="submit" disabled={isAddingTransaction}>
                  {isAddingTransaction ? 'جاري الحفظ...' : 'حفظ المصروف'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* فلاتر البحث */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="البحث في المصروفات..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="حالة المصروف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="paid">مدفوع</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* قائمة المصروفات */}
      <div className="space-y-4">
        {filteredTransactions.map((transaction) => (
          <Card key={transaction.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-4 h-4 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: transaction.category?.color || '#gray' }}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{transaction.description}</h3>
                        {getStatusBadge(transaction.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {transaction.category?.name_ar} • {transaction.transaction_number}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(transaction.transaction_date).toLocaleDateString('ar')}
                        </div>
                        {transaction.vendor_name && (
                          <div className="flex items-center gap-1">
                            <Receipt className="h-3 w-3" />
                            {transaction.vendor_name}
                          </div>
                        )}
                        <div>
                          طريقة الدفع: {
                            transaction.payment_method === 'cash' ? 'نقداً' :
                            transaction.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                            transaction.payment_method === 'credit_card' ? 'بطاقة ائتمان' : 'شيك'
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-2xl font-bold">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    {transaction.amount.toLocaleString()} {transaction.currency}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTransactions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد مصروفات</h3>
            <p className="text-gray-600 mb-4">
              لم يتم العثور على مصروفات مطابقة لمعايير البحث
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ExpenseTransactions;
