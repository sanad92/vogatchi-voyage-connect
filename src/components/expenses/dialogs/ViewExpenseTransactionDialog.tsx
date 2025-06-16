
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, DollarSign, CreditCard, Receipt, User, MapPin } from 'lucide-react';
import type { ExpenseTransaction } from '@/types/expenses';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

interface ViewExpenseTransactionDialogProps {
  transaction: ExpenseTransaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ViewExpenseTransactionDialog = ({ transaction, open, onOpenChange }: ViewExpenseTransactionDialogProps) => {
  if (!transaction) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">في الانتظار</Badge>;
      case 'approved': return <Badge className="bg-green-100 text-green-800">معتمدة</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800">مرفوضة</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'نقداً';
      case 'bank_transfer': return 'تحويل بنكي';
      case 'credit_card': return 'بطاقة ائتمان';
      case 'check': return 'شيك';
      default: return method;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            تفاصيل المعاملة المالية
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* المعلومات الأساسية */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">رقم المعاملة</label>
                  <p className="text-lg font-semibold">{transaction.transaction_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">الحالة</label>
                  <div className="mt-1">
                    {getStatusBadge(transaction.status)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">المبلغ</label>
                  <p className="text-2xl font-bold text-green-600">
                    <EgyptianPoundDisplay amount={transaction.amount} />
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">تاريخ المعاملة</label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p>{new Date(transaction.transaction_date).toLocaleDateString('ar')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* الوصف والفئة */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">الوصف</label>
                  <p className="text-lg">{transaction.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">الفئة</label>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: transaction.expense_categories?.color || '#gray' }}
                    />
                    <p>{transaction.expense_categories?.name_ar}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* معلومات الدفع والمورد */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">طريقة الدفع</label>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-gray-400" />
                    <p>{getPaymentMethodText(transaction.payment_method)}</p>
                  </div>
                </div>
                {transaction.vendor_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">اسم المورد</label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <p>{transaction.vendor_name}</p>
                    </div>
                  </div>
                )}
                {transaction.vendor_phone && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">هاتف المورد</label>
                    <p>{transaction.vendor_phone}</p>
                  </div>
                )}
                {transaction.invoice_number && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">رقم الفاتورة</label>
                    <p>{transaction.invoice_number}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* الملاحظات */}
          {transaction.notes && (
            <Card>
              <CardContent className="p-6">
                <label className="text-sm font-medium text-gray-600">الملاحظات</label>
                <p className="mt-2 text-gray-700">{transaction.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* معلومات إضافية */}
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <label className="font-medium">تاريخ الإنشاء</label>
                  <p>{new Date(transaction.created_at).toLocaleString('ar')}</p>
                </div>
                <div>
                  <label className="font-medium">آخر تحديث</label>
                  <p>{new Date(transaction.updated_at).toLocaleString('ar')}</p>
                </div>
                {transaction.approved_at && (
                  <div>
                    <label className="font-medium">تاريخ الموافقة</label>
                    <p>{new Date(transaction.approved_at).toLocaleString('ar')}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewExpenseTransactionDialog;
