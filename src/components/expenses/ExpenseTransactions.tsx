
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import type { ExpenseTransaction } from '@/types/expenses';
import ExpenseTransactionForm from './ExpenseTransactionForm';
import ExpenseTransactionCard from './ExpenseTransactionCard';
import ExpenseTransactionFilters from './ExpenseTransactionFilters';
import ExpenseTransactionEmptyState from './ExpenseTransactionEmptyState';

const ExpenseTransactions = () => {
  const { 
    expenseTransactions, 
    addExpenseTransaction, 
    isAddingTransaction 
  } = useExpenses();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredTransactions = expenseTransactions?.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.vendor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.transaction_number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const handleAddTransaction = (transaction: Omit<ExpenseTransaction, 'id' | 'created_at' | 'updated_at' | 'transaction_number'>) => {
    addExpenseTransaction(transaction);
    setIsAddDialogOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">إدارة المصروفات</h2>
          <p className="text-gray-600">تسجيل ومتابعة جميع المصروفات العامة للشركة بالجنيه المصري</p>
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
            
            <ExpenseTransactionForm
              onSubmit={handleAddTransaction}
              isSubmitting={isAddingTransaction}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <ExpenseTransactionFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      {/* Transaction List */}
      <div className="space-y-4">
        {filteredTransactions.map((transaction) => (
          <ExpenseTransactionCard key={transaction.id} transaction={transaction} />
        ))}
      </div>

      {filteredTransactions.length === 0 && <ExpenseTransactionEmptyState />}
    </div>
  );
};

export default ExpenseTransactions;
