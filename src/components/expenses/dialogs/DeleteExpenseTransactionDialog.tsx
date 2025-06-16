
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Trash2 } from 'lucide-react';
import type { ExpenseTransaction } from '@/types/expenses';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

interface DeleteExpenseTransactionDialogProps {
  transaction: ExpenseTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => Promise<void>;
  isDeleting: boolean;
}

const DeleteExpenseTransactionDialog = ({ 
  transaction, 
  open, 
  onOpenChange, 
  onConfirm, 
  isDeleting 
}: DeleteExpenseTransactionDialogProps) => {
  const handleConfirm = async () => {
    if (!transaction) return;
    await onConfirm(transaction.id);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            حذف المعاملة المالية
          </DialogTitle>
          <DialogDescription>
            هذا الإجراء لا يمكن التراجع عنه. هل أنت متأكد من رغبتك في حذف هذه المعاملة؟
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="font-medium text-red-800">تحذير</span>
            </div>
            <p className="text-sm text-red-700">
              سيتم حذف المعاملة نهائياً من النظام ولن يمكن استردادها.
            </p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <h4 className="font-medium">تفاصيل المعاملة المراد حذفها:</h4>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">رقم المعاملة:</span> {transaction.transaction_number}</p>
              <p><span className="font-medium">الوصف:</span> {transaction.description}</p>
              <p><span className="font-medium">المبلغ:</span> <EgyptianPoundDisplay amount={transaction.amount} /></p>
              <p><span className="font-medium">التاريخ:</span> {new Date(transaction.transaction_date).toLocaleDateString('ar')}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
              إلغاء
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirm} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'جاري الحذف...' : 'تأكيد الحذف'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteExpenseTransactionDialog;
