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
  CreditCard,
  Eye,
  Edit,
  Trash2,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Check,
  X
} from 'lucide-react';
import { useExpenseTransactionsOptimized } from '@/hooks/useExpenseTransactionsOptimized';
import { useExpenseCategories } from '@/hooks/useExpenseCategories';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { useDebounce } from '@/hooks/useDebounce';
import ExpenseTransactionForm from './ExpenseTransactionForm';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';
import ViewExpenseTransactionDialog from './dialogs/ViewExpenseTransactionDialog';
import EditExpenseTransactionDialog from './dialogs/EditExpenseTransactionDialog';
import DeleteExpenseTransactionDialog from './dialogs/DeleteExpenseTransactionDialog';
import ApproveRejectTransactionDialog from './dialogs/ApproveRejectTransactionDialog';

const OptimizedExpenseTransactions = () => {
  // حالة الفلاتر والصفحات
  const [filters, setFilters] = useState({
    search: '',
    categoryId: 'all',
    status: 'all',
    paymentMethod: 'all',
    dateFrom: '',
    dateTo: '',
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [showForm, setShowForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // حالة الحوارات
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [approveRejectDialogOpen, setApproveRejectDialogOpen] = useState(false);

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
    isUpdating,
    isDeleting,
  } = useExpenseTransactionsOptimized(debouncedFilters, { page: currentPage, pageSize });

  // بيانات مساعدة للفلاتر
  const { expenseCategories: categories } = useExpenseCategories();
  const { bankAccounts } = useBankAccounts();

  // معالجة تغيير الفلاتر
  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
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
      categoryId: 'all',
      status: 'all',
      paymentMethod: 'all',
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

  // معالجة عرض المعاملة
  const handleViewTransaction = useCallback((transaction: any) => {
    setSelectedTransaction(transaction);
    setViewDialogOpen(true);
  }, []);

  // معالجة تعديل المعاملة
  const handleEditTransaction = useCallback((transaction: any) => {
    setSelectedTransaction(transaction);
    setEditDialogOpen(true);
  }, []);

  // معالجة حذف المعاملة
  const handleDeleteTransaction = useCallback((transaction: any) => {
    setSelectedTransaction(transaction);
    setDeleteDialogOpen(true);
  }, []);

  // معالجة الموافقة/الرفض
  const handleApproveReject = useCallback((transaction: any) => {
    setSelectedTransaction(transaction);
    setApproveRejectDialogOpen(true);
  }, []);

  // تنفيذ التعديل
  const handleUpdateTransaction = useCallback(async (id: string, data: any) => {
    try {
      await updateTransaction({ id, ...data });
      setEditDialogOpen(false);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('خطأ في تحديث المعاملة:', error);
    }
  }, [updateTransaction]);

  // تنفيذ الحذف
  const handleConfirmDelete = useCallback(async (id: string) => {
    try {
      await deleteTransaction(id);
      setDeleteDialogOpen(false);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('خطأ في حذف المعاملة:', error);
    }
  }, [deleteTransaction]);

  // تنفيذ الموافقة
  const handleApprove = useCallback(async (id: string, notes?: string) => {
    try {
      await updateTransaction({ 
        id, 
        status: 'approved',
        approved_at: new Date().toISOString(),
        notes: notes || undefined
      });
      setApproveRejectDialogOpen(false);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('خطأ في الموافقة على المعاملة:', error);
    }
  }, [updateTransaction]);

  // تنفيذ الرفض
  const handleReject = useCallback(async (id: string, notes: string) => {
    try {
      await updateTransaction({ 
        id, 
        status: 'rejected',
        notes: notes
      });
      setApproveRejectDialogOpen(false);
      setSelectedTransaction(null);
    } catch (error) {
      console.error('خطأ في رفض المعاملة:', error);
    }
  }, [updateTransaction]);

  // إحصائيات سريعة
  const stats = useMemo(() => {
    const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
    const pending = transactions.filter(t => t.status === 'pending').length;
    const approved = transactions.filter(t => t.status === 'approved').length;
    const rejected = transactions.filter(t => t.status === 'rejected').length;
    
    return { total, pending, approved, rejected };
  }, [transactions]);

  // دالة لإرجاع لون الحالة
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'approved': return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // دالة لإرجاع أيقونة الحالة
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'approved': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  if (error) {
    return (
      <Card className="shadow-lg border-red-200">
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">حدث خطأ في تحميل المعاملات</h3>
          <p className="text-red-600 mb-4">يرجى المحاولة مرة أخرى</p>
          <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
            إعادة المحاولة
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-gray-50 min-h-screen">
      {/* شريط الإحصائيات السريعة - محسن */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 mb-1">إجمالي المعاملات</p>
                <p className="text-3xl font-bold text-blue-900">{totalCount.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-blue-500 rounded-full">
                <FileText className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200 rounded-full opacity-20 -mr-10 -mt-10"></div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100 border-green-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600 mb-1">المبلغ الإجمالي</p>
                <p className="text-2xl font-bold text-green-900">
                  <EgyptianPoundDisplay amount={stats.total} />
                </p>
              </div>
              <div className="p-3 bg-green-500 rounded-full">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-green-200 rounded-full opacity-20 -mr-10 -mt-10"></div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600 mb-1">في انتظار الموافقة</p>
                <p className="text-3xl font-bold text-yellow-900">{stats.pending}</p>
              </div>
              <div className="p-3 bg-yellow-500 rounded-full">
                <Clock className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-200 rounded-full opacity-20 -mr-10 -mt-10"></div>
          </CardContent>
        </Card>
        
        <Card className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 mb-1">معتمدة</p>
                <p className="text-3xl font-bold text-purple-900">{stats.approved}</p>
              </div>
              <div className="p-3 bg-purple-500 rounded-full">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-20 h-20 bg-purple-200 rounded-full opacity-20 -mr-10 -mt-10"></div>
          </CardContent>
        </Card>
      </div>

      {/* أدوات التحكم - محسنة */}
      <Card className="shadow-lg border-gray-200">
        <CardHeader className="pb-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500 rounded-lg">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-xl text-gray-800">إدارة المصروفات</CardTitle>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Filter className="h-4 w-4 mr-2" />
                الفلاتر
              </Button>
              <Button 
                onClick={() => setShowForm(true)} 
                disabled={isAdding}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                {isAdding ? 'جاري الإضافة...' : 'إضافة معاملة'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          {/* شريط البحث - محسن */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              placeholder="البحث في المعاملات..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-12 h-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 text-lg"
            />
          </div>

          {/* الفلاتر المتقدمة - محسنة */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200">
              <Select value={filters.categoryId} onValueChange={(value) => handleFilterChange('categoryId', value)}>
                <SelectTrigger className="h-10 border-gray-300">
                  <SelectValue placeholder="الفئة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الفئات</SelectItem>
                  {categories?.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: category.color || '#gray' }}
                        />
                        {category.name_ar}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger className="h-10 border-gray-300">
                  <SelectValue placeholder="الحالة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">في الانتظار</SelectItem>
                  <SelectItem value="approved">معتمدة</SelectItem>
                  <SelectItem value="rejected">مرفوضة</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.paymentMethod} onValueChange={(value) => handleFilterChange('paymentMethod', value)}>
                <SelectTrigger className="h-10 border-gray-300">
                  <SelectValue placeholder="طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الطرق</SelectItem>
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
                className="h-10 border-gray-300"
              />

              <Input
                type="date"
                placeholder="إلى تاريخ"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                className="h-10 border-gray-300"
              />

              <Button 
                variant="outline" 
                onClick={resetFilters} 
                className="h-10 border-gray-300 hover:bg-gray-50"
              >
                إعادة تعيين
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* قائمة المعاملات - محسنة */}
      <Card className="shadow-lg border-gray-200">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-4 p-6">
              {Array.from({ length: pageSize }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                  <Skeleton className="h-8 w-[100px]" />
                </div>
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16">
              <FileText className="h-20 w-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">لا توجد معاملات</h3>
              <p className="text-gray-500 mb-6">ابدأ بإضافة معاملة مصروفات جديدة</p>
              {Object.values(debouncedFilters).some(v => v) && (
                <Button variant="outline" onClick={resetFilters} className="bg-white hover:bg-gray-50">
                  إعادة تعيين الفلاتر
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div 
                          className="w-5 h-5 rounded-full mt-1 flex-shrink-0 shadow-sm"
                          style={{ backgroundColor: transaction.expense_categories?.color || '#gray' }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 text-lg truncate">
                              {transaction.description}
                            </h3>
                            <Badge className={`${getStatusColor(transaction.status)} border flex items-center gap-1`}>
                              {getStatusIcon(transaction.status)}
                              {transaction.status === 'pending' ? 'في الانتظار' :
                               transaction.status === 'approved' ? 'معتمدة' :
                               transaction.status === 'rejected' ? 'مرفوضة' : transaction.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600 mb-3">
                            {transaction.expense_categories?.name_ar} • {transaction.transaction_number}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {new Date(transaction.transaction_date).toLocaleDateString('ar')}
                            </div>
                            {transaction.vendor_name && (
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4" />
                                {transaction.vendor_name}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span>طريقة الدفع:</span>
                              <span className="font-medium">
                                {transaction.payment_method === 'cash' ? 'نقداً' :
                                 transaction.payment_method === 'bank_transfer' ? 'تحويل بنكي' :
                                 transaction.payment_method === 'credit_card' ? 'بطاقة ائتمان' : 'شيك'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-2xl font-bold text-green-600 mb-3">
                        <DollarSign className="h-6 w-6" />
                        <EgyptianPoundDisplay amount={transaction.amount} />
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-3"
                          onClick={() => handleViewTransaction(transaction)}
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-3"
                          onClick={() => handleEditTransaction(transaction)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8 px-3 text-red-600 hover:text-red-700"
                          onClick={() => handleDeleteTransaction(transaction)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        {transaction.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 px-3 text-blue-600 hover:text-blue-700"
                            onClick={() => handleApproveReject(transaction)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            إدارة
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* التنقل بين الصفحات - محسن */}
      {totalPages > 1 && (
        <Card className="shadow-lg border-gray-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 font-medium">
                  عرض {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalCount)} من {totalCount}
                </span>
                <Select 
                  value={pageSize.toString()} 
                  onValueChange={(value) => {
                    setPageSize(Number(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-24 h-9">
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
                  className="h-9 px-4"
                >
                  <ChevronRight className="h-4 w-4 mr-1" />
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
                        className="w-9 h-9 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && <span className="text-gray-400 px-2">...</span>}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={!hasNextPage}
                  className="h-9 px-4"
                >
                  التالي
                  <ChevronLeft className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* نموذج إضافة معاملة */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <ExpenseTransactionForm
              onSubmit={handleAddTransaction}
              onCancel={() => setShowForm(false)}
              isSubmitting={isAdding}
            />
          </div>
        </div>
      )}

      {/* الحوارات */}
      <ViewExpenseTransactionDialog
        transaction={selectedTransaction}
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
      />

      <EditExpenseTransactionDialog
        transaction={selectedTransaction}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleUpdateTransaction}
        isSubmitting={isUpdating}
      />

      <DeleteExpenseTransactionDialog
        transaction={selectedTransaction}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      <ApproveRejectTransactionDialog
        transaction={selectedTransaction}
        open={approveRejectDialogOpen}
        onOpenChange={setApproveRejectDialogOpen}
        onApprove={handleApprove}
        onReject={handleReject}
        isSubmitting={isUpdating}
      />
    </div>
  );
};

export default OptimizedExpenseTransactions;
