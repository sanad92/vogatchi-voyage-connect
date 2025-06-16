
import { useExpenseTransactionsOptimized } from './useExpenseTransactionsOptimized';

// تصدير النسخة المحسنة كافتراضي للتوافق مع الكود الموجود
export const useExpenseTransactions = useExpenseTransactionsOptimized;

// إبقاء التصدير القديم للتوافق
export { useExpenseTransactionsOptimized };

// Hook مبسط للحصول على الإحصائيات فقط
export const useExpenseStats = () => {
  const { transactions, totalCount, isLoading } = useExpenseTransactionsOptimized(
    {}, 
    { page: 1, pageSize: 1000 } // تحميل عدد كبير للإحصائيات
  );

  const stats = {
    totalTransactions: totalCount,
    totalAmount: transactions.reduce((sum, t) => sum + Number(t.amount), 0),
    pendingCount: transactions.filter(t => t.status === 'pending').length,
    approvedCount: transactions.filter(t => t.status === 'approved').length,
    rejectedCount: transactions.filter(t => t.status === 'rejected').length,
  };

  return {
    stats,
    isLoading,
  };
};
