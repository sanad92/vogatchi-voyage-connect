
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle } from 'lucide-react';
import type { ExpenseTransaction } from '@/types/expenses';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

interface ApproveRejectTransactionDialogProps {
  transaction: ExpenseTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, notes: string) => Promise<void>;
  isSubmitting: boolean;
}

const ApproveRejectTransactionDialog = ({ 
  transaction, 
  open, 
  onOpenChange, 
  onApprove, 
  onReject, 
  isSubmitting 
}: ApproveRejectTransactionDialogProps) => {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');

  const handleSubmit = async () => {
    if (!transaction || !action) return;

    if (action === 'approve') {
      await onApprove(transaction.id, notes || undefined);
    } else if (action === 'reject') {
      if (!notes.trim()) {
        alert('يجب إدخال سبب الرفض');
        return;
      }
      await onReject(transaction.id, notes);
    }

    setAction(null);
    setNotes('');
    onOpenChange(false);
  };

  const handleClose = () => {
    setAction(null);
    setNotes('');
    onOpenChange(false);
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {action === 'approve' ? 'الموافقة على المعاملة' : 
             action === 'reject' ? 'رفض المعاملة' : 
             'إدارة المعاملة'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* تفاصيل المعاملة */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-2">
            <h4 className="font-medium">تفاصيل المعاملة:</h4>
            <div className="text-sm space-y-1">
              <p><span className="font-medium">رقم المعاملة:</span> {transaction.transaction_number}</p>
              <p><span className="font-medium">الوصف:</span> {transaction.description}</p>
              <p><span className="font-medium">المبلغ:</span> <EgyptianPoundDisplay amount={transaction.amount} /></p>
              <p><span className="font-medium">الفئة:</span> {transaction.expense_categories?.name_ar}</p>
            </div>
          </div>

          {!action && (
            <div className="flex gap-3">
              <Button 
                onClick={() => setAction('approve')}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                disabled={isSubmitting}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                موافقة
              </Button>
              <Button 
                onClick={() => setAction('reject')}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                disabled={isSubmitting}
              >
                <XCircle className="h-4 w-4 mr-2" />
                رفض
              </Button>
            </div>
          )}

          {action && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="notes">
                  {action === 'approve' ? 'ملاحظات (اختياري)' : 'سبب الرفض *'}
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    action === 'approve' 
                      ? 'أضف ملاحظات إضافية...' 
                      : 'يرجى توضيح سبب رفض المعاملة...'
                  }
                  rows={3}
                  required={action === 'reject'}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setAction(null)} disabled={isSubmitting}>
                  رجوع
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting || (action === 'reject' && !notes.trim())}
                  className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
                >
                  {isSubmitting ? 'جاري المعالجة...' : 
                   action === 'approve' ? 'تأكيد الموافقة' : 'تأكيد الرفض'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ApproveRejectTransactionDialog;
