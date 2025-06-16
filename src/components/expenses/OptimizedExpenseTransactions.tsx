
import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Search, 
  Plus, 
  Filter, 
  ChevronLeft, 
  ChevronRight,
  FileText,
  Calendar,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { useExpenseTransactionsOptimized } from '@/hooks/useExpenseTransactionsOptimized';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useDebounce } from '@/hooks/useDebounce';
import ExpenseTransactionCard from './ExpenseTransactionCard';
import ExpenseTransactionForm from './ExpenseTransactionForm';

const OptimizedExpenseTransactions = () => {
  // حالة الفلاتر والصفحات
  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    status: '',
    paymentMethod: '',
    dateFrom: '',
    dateTo: '',
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // استخدام debounce للبحث لتحسين الأداء
  const debouncedSearch = useDebounce(filters.search, 500);
  const debouncedFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch
  }), [filters, debouncedSearch]);

  // جلب البيانات المحسنة
  const {
    transactions,
    totalCount,
    isLoading,
    error,
    currentPage: page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    isAdding,
  } = useExpenseTransactionsOptimized(debouncedFilters, { page: currentPage, pageSize });

  // بيانات مساعدة للفلاتر
  const { categories } = useExpenseCategories();
  const { bankAccounts } = useBankAccounts();

  // معالجة تغيير الفلاتر
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // العودة للصفحة الأولى عند تغيير الفلتر
  }, []);

  // معالجة تغيير الصفحة
  const handlePageChange = useCallback((newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // إعادة تعيين الفلاتر
  const resetFilters = useCallback(() => {
    setFilters({
      search: '',
      categoryId: '',
      status: '',
      paymentMethod: '',
      dateFrom: '',
      dateTo: '',
    });
    setCurrentPage(1);
  }, []);

  // معالجة إضافة معاملة جديدة
  const handleAddTransaction = useCallback(async (data: any) => {
    try {
      await addTransaction(data);
      setShowForm(false);
    } catch (error) {
      console.error('خطأ في إضافة المعاملة:', error);
    }
  }, [addTransaction]);

  // إحصائيات سريعة
  const stats = useMemo(() => {
    const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const pending = transactions.filter(t => t.status === 'pending').length;
    const approved = transactions.filter(t => t.status === 'approved').length;
    
    return { total, pending, approved };
  }, [transactions]);

  if (error) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-red-600">حدث خطأ في تحميل المعاملات</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* شريط الإحصائيات السريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">إجمالي المعاملات</p>
                <p className="text-lg font-bold">{totalCount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">المبلغ الإجمالي</p>
                <p className="text-lg font-bold">{stats.total.toLocaleString()} ج.م</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm text-gray-600">في انتظار الموافقة</p>
                <p className="text-lg font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">معتمدة</p>
                <p className="text-lg font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* أدوات التحكم */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">إدارة المصروفات</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                الفلاتر
              </Button>
              <Button onClick={() => setShowForm(true)} disabled={isAdding}>
                <Plus className="h-4 w-4 mr-2" />
                {isAdding ? 'جاري الإضافة...' : 'إضافة معاملة'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* شريط البحث */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="البحث في المعاملات..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* الفلاتر المتقدمة */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-gray-50 rounded-lg">
              <Select value={filters.categoryId} onValueChange={(value) => handleFilterChange('categoryId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع الفئات</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع الحالات</SelectItem>
                  <SelectItem value="pending">في الانتظار</SelectItem>
                  <SelectItem value="approved">معتمدة</SelectItem>
                  <SelectItem value="rejected">مرفوضة</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.paymentMethod} onValueChange={(value) => handleFilterChange('paymentMethod', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع الطرق</SelectItem>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                  <SelectItem value="check">شيك</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="date"
                placeholder="من تاريخ"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />

              <Input
                type="date"
                placeholder="إلى تاريخ"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />

              <Button variant="outline" onClick={resetFilters} className="col-span-1">
                إعادة تعيين
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* قائمة المعاملات */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: pageSize }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">لا توجد معاملات</p>
              {Object.values(debouncedFilters).some(v => v) && (
                <Button variant="outline" onClick={resetFilters} className="mt-4">
                  إعادة تعيين الفلاتر
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {transactions.map((transaction) => (
                <ExpenseTransactionCard
                  key={transaction.id}
                  transaction={transaction}
                  onUpdate={updateTransaction}
                  onDelete={deleteTransaction}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* التنقل بين الصفحات */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  عرض {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} من {totalCount}
                </span>
                <Select 
                  value={pageSize.toString()} 
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={!hasPrevPage}
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-gray-400">...</span>}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNextPage}
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* نموذج إضافة معاملة */}
      {showForm && (
        <ExpenseTransactionForm
          isOpen={showForm}
          onClose={() => setShowForm(false)}
          onSubmit={handleAddTransaction}
        />
      )}
    </div>
  );
};

export default OptimizedExpenseTransactions;
