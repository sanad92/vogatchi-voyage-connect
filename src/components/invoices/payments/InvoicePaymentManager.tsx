
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, DollarSign } from 'lucide-react';
import { useInvoicePayments } from '@/hooks/useInvoicePayments';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

interface InvoicePaymentManagerProps {
  invoice: any;
}

const InvoicePaymentManager = ({ invoice }: InvoicePaymentManagerProps) => {
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    payment_amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'cash',
    bank_account_id: '',
    reference_number: '',
    notes: '',
  });

  const { payments, isLoading, addPayment, updatePayment, deletePayment, isAdding, isUpdating, isDeleting } = useInvoicePayments(invoice?.id);

  const handleSubmit = () => {
    if (!paymentForm.payment_amount || parseFloat(paymentForm.payment_amount) <= 0) {
      return;
    }

    const paymentData = {
      invoice_id: invoice.id,
      payment_amount: parseFloat(paymentForm.payment_amount),
      payment_date: paymentForm.payment_date,
      payment_method: paymentForm.payment_method,
      bank_account_id: paymentForm.bank_account_id || null,
      reference_number: paymentForm.reference_number || null,
      notes: paymentForm.notes || null,
    };

    if (editingPayment) {
      updatePayment({ paymentId: editingPayment.id, updateData: paymentData });
    } else {
      addPayment(paymentData);
    }

    setPaymentForm({
      payment_amount: '',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash',
      bank_account_id: '',
      reference_number: '',
      notes: '',
    });
    setShowAddPayment(false);
    setEditingPayment(null);
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'fully_paid':
        return <Badge className="bg-green-100 text-green-800">مدفوعة بالكامل</Badge>;
      case 'partially_paid':
        return <Badge className="bg-yellow-100 text-yellow-800">مدفوعة جزئياً</Badge>;
      case 'unpaid':
        return <Badge className="bg-red-100 text-red-800">غير مدفوعة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods = {
      cash: 'نقداً',
      bank_transfer: 'تحويل بنكي',
      credit_card: 'بطاقة ائتمان',
      check: 'شيك',
      instant_transfer: 'تحويل فوري',
    };
    return methods[method] || method;
  };

  return (
    <div className="space-y-6">
      {/* ملخص الفاتورة والمدفوعات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            ملخص المدفوعات - فاتورة {invoice?.invoice_number}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">إجمالي الفاتورة</p>
              <p className="text-2xl font-bold">{invoice?.final_amount?.toLocaleString()} {invoice?.currency}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">المبلغ المدفوع</p>
              <p className="text-2xl font-bold text-green-600">{invoice?.total_paid_amount?.toLocaleString()} {invoice?.currency}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">المبلغ المتبقي</p>
              <p className="text-2xl font-bold text-red-600">{invoice?.remaining_amount?.toLocaleString()} {invoice?.currency}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">حالة الدفع</p>
              <div className="mt-2">{getPaymentStatusBadge(invoice?.payment_status)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* قائمة المدفوعات */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>سجل المدفوعات</CardTitle>
            <Dialog open={showAddPayment} onOpenChange={setShowAddPayment}>
              <DialogTrigger asChild>
                <Button disabled={invoice?.payment_status === 'fully_paid'}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة دفعة
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة دفعة جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="payment_amount">مبلغ الدفعة</Label>
                    <Input
                      id="payment_amount"
                      type="number"
                      step="0.01"
                      max={invoice?.remaining_amount}
                      value={paymentForm.payment_amount}
                      onChange={(e) => setPaymentForm({...paymentForm, payment_amount: e.target.value})}
                      placeholder="أدخل المبلغ"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      الحد الأقصى: {invoice?.remaining_amount?.toLocaleString()} {invoice?.currency}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="payment_date">تاريخ الدفع</Label>
                    <Input
                      id="payment_date"
                      type="date"
                      value={paymentForm.payment_date}
                      onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                    />
                  </div>

                  <div>
                    <Label htmlFor="payment_method">طريقة الدفع</Label>
                    <Select value={paymentForm.payment_method} onValueChange={(value) => setPaymentForm({...paymentForm, payment_method: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">نقداً</SelectItem>
                        <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                        <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                        <SelectItem value="check">شيك</SelectItem>
                        <SelectItem value="instant_transfer">تحويل فوري</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="reference_number">رقم المرجع</Label>
                    <Input
                      id="reference_number"
                      value={paymentForm.reference_number}
                      onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
                      placeholder="رقم التحويل أو الشيك"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">ملاحظات</Label>
                    <Textarea
                      id="notes"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                      placeholder="ملاحظات إضافية"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={handleSubmit} disabled={isAdding || isUpdating} className="flex-1">
                      {editingPayment ? 'تحديث الدفعة' : 'إضافة الدفعة'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowAddPayment(false)}>
                      إلغاء
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">جاري تحميل المدفوعات...</div>
          ) : payments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              لا توجد مدفوعات مسجلة لهذه الفاتورة
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>تاريخ الدفع</TableHead>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead>رقم المرجع</TableHead>
                  <TableHead>ملاحظات</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-semibold">
                      {payment.payment_amount.toLocaleString()} {invoice?.currency}
                    </TableCell>
                    <TableCell>
                      {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      {getPaymentMethodLabel(payment.payment_method)}
                    </TableCell>
                    <TableCell>{payment.reference_number || '-'}</TableCell>
                    <TableCell>{payment.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPayment(payment);
                            setPaymentForm({
                              payment_amount: payment.payment_amount.toString(),
                              payment_date: payment.payment_date,
                              payment_method: payment.payment_method,
                              bank_account_id: payment.bank_account_id || '',
                              reference_number: payment.reference_number || '',
                              notes: payment.notes || '',
                            });
                            setShowAddPayment(true);
                          }}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذه الدفعة؟')) {
                              deletePayment(payment.id);
                            }
                          }}
                          disabled={isDeleting}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoicePaymentManager;
