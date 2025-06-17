
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, Download } from 'lucide-react';
import { useFinancialData } from '@/hooks/useFinancialData';

const ExpenseTransactions = () => {
  const { expenseTransactions, expenseCategories, exchangeRates } = useFinancialData();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'معتمد';
      case 'pending': return 'معلق';
      case 'rejected': return 'مرفوض';
      default: return status;
    }
  };

  const convertToEGP = (amount: number, currency: string) => {
    if (currency === 'EGP') return amount;
    const rate = exchangeRates?.find(r => r.from_currency === currency && r.to_currency === 'EGP')?.rate || 1;
    return amount * rate;
  };

  // تصفية البيانات
  const filteredTransactions = expenseTransactions?.filter(transaction => {
    const matchesSearch = !searchTerm || 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    
    const matchesCategory = categoryFilter === 'all' || transaction.category_id === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">معاملات المصروفات</h2>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          تصدير
        </Button>
      </div>

      {/* شريط البحث والفلاتر */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="البحث في المعاملات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="pending">معلق</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="الفئة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الفئات</SelectItem>
                {expenseCategories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name_ar}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* جدول المعاملات */}
      <Card>
        <CardHeader>
          <CardTitle>المعاملات ({filteredTransactions?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-2">رقم المعاملة</th>
                  <th className="text-right p-2">التاريخ</th>
                  <th className="text-right p-2">الوصف</th>
                  <th className="text-right p-2">الفئة</th>
                  <th className="text-right p-2">المورد</th>
                  <th className="text-right p-2">المبلغ</th>
                  <th className="text-right p-2">العملة</th>
                  <th className="text-right p-2">الحالة</th>
                  <th className="text-right p-2">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions?.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-mono text-sm">{transaction.transaction_number}</td>
                    <td className="p-2">{new Date(transaction.transaction_date).toLocaleDateString('ar-EG')}</td>
                    <td className="p-2">{transaction.description}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: transaction.category?.color }}
                        />
                        {transaction.category?.name_ar}
                      </div>
                    </td>
                    <td className="p-2">{transaction.vendor_name || 'غير محدد'}</td>
                    <td className="p-2 font-semibold">
                      {transaction.amount.toLocaleString()}
                      {transaction.currency !== 'EGP' && (
                        <div className="text-xs text-gray-500">
                          ≈ {convertToEGP(transaction.amount, transaction.currency).toLocaleString()} ج.م
                        </div>
                      )}
                    </td>
                    <td className="p-2">{transaction.currency}</td>
                    <td className="p-2">
                      <Badge className={getStatusColor(transaction.status)}>
                        {getStatusText(transaction.status)}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Button variant="ghost" size="sm">
                        عرض
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseTransactions;
