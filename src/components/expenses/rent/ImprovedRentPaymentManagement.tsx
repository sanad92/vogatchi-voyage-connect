
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, CreditCard, Plus, AlertTriangle, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useRentPaymentsImproved } from '@/hooks/useRentPaymentsImproved';
import { useRentContracts } from '@/hooks/useRentContracts';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { SupportedCurrency } from '@/types/currency';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

interface PaymentFormData {
  contract_id: string;
  payment_month: string;
  amount: number;
  currency: SupportedCurrency;
  due_date: string;
  payment_method: string;
  bank_account_id: string;
  notes: string;
}

const ImprovedRentPaymentManagement = () => {
  const { 
    rentPayments, 
    paymentsLoading, 
    paymentsError,
    addRentPayment, 
    isAddingPayment, 
    updatePaymentStatus,
    isUpdatingPayment,
    getPaymentStatistics
  } = useRentPaymentsImproved();
  
  const { rentContracts } = useRentContracts();
  const { bankAccounts } = useBankAccounts();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const [paymentData, setPaymentData] = useState<PaymentFormData>({
    contract_id: '',
    payment_month: new Date().toISOString().slice(0, 7),
    amount: 0,
    currency: 'EGP' as SupportedCurrency,
    due_date: '',
    payment_method: 'bank_transfer',
    bank_account_id: '',
    notes: ''
  });

  // التحقق من صحة البيانات
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!paymentData.contract_id) {
      errors.push('يجب اختيار عقد إيجار');
    }

    if (!paymentData.payment_month) {
      errors.push('يجب تحديد شهر الدفع');
    }

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('يجب إدخال مبلغ صحيح');
    }

    if (!paymentData.due_date) {
      errors.push('يجب تحديد تاريخ الاستحقاق');
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleInputChange = (field: keyof PaymentFormData, value: string | number) => {
    setPaymentData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // مسح أخطاء التحقق عند تغيير البيانات
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleAddPayment = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await addRentPayment({
        contract_id: paymentData.contract_id,
        payment_month: paymentData.payment_month,
        amount: paymentData.amount,
        currency: paymentData.currency,
        due_date: paymentData.due_date,
        payment_method: paymentData.payment_method,
        bank_account_id: paymentData.bank_account_id || undefined,
        notes: paymentData.notes,
        status: 'pending',
        late_fee: 0,
        created_by: 'current-user-id' // سيتم تحديثه تلقائياً في الـ hook
      });
      
      // إعادة تعيين النموذج عند النجاح
      setIsDialogOpen(false);
      setPaymentData({
        contract_id: '',
        payment_month: new Date().toISOString().slice(0, 7),
        amount: 0,
        currency: 'EGP' as SupportedCurrency,
        due_date: '',
        payment_method: 'bank_transfer',
        bank_account_id: '',
        notes: ''
      });
    } catch (error) {
      console.error('خطأ في إضافة دفعة الإيجار:', error);
    }
  };

  const handleStatusUpdate = async (id: string, status: any) => {
    try {
      await updatePaymentStatus({
        id,
        status,
        payment_date: status === 'paid' ? new Date().toISOString().slice(0, 10) : undefined
      });
    } catch (error) {
      console.error('خطأ في تحديث حالة الدفعة:', error);
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === 'pending';
    
    if (isOverdue) {
      return <Badge variant="destructive">متأخر</Badge>;
    }
    
    const statusConfig = {
      pending: { label: 'معلق', variant: 'secondary' as const },
      paid: { label: 'مدفوع', variant: 'default' as const },
      overdue: { label: 'متأخر', variant: 'destructive' as const },
      cancelled: { label: 'ملغي', variant: 'outline' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (paymentsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>جاري تحميل مدفوعات الإيجار...</span>
      </div>
    );
  }

  if (paymentsError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          حدث خطأ في تحميل مدفوعات الإيجار. يرجى المحاولة مرة أخرى.
        </AlertDescription>
      </Alert>
    );
  }

  const statistics = getPaymentStatistics();

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          نظام إدارة مدفوعات الإيجار المحسّن مع دعم العملات المتعددة وحسابات دقيقة.
          جميع المبالغ محولة تلقائياً إلى الجنيه المصري.
        </AlertDescription>
      </Alert>

      {/* عرض أخطاء التحقق */}
      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* إحصائيات سريعة */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Calendar className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">المدفوعات المعلقة</p>
                  <p className="text-2xl font-bold">{statistics.pendingCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">المدفوعات المتأخرة</p>
                  <p className="text-2xl font-bold">{statistics.overdueCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CreditCard className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">إجمالي المعلق</p>
                  <p className="text-2xl font-bold">
                    <EgyptianPoundDisplay amount={statistics.totalPendingAmount} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">المدفوع هذا الشهر</p>
                  <p className="text-2xl font-bold">
                    <EgyptianPoundDisplay amount={statistics.totalPaidThisMonth} />
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* أزرار الإجراءات */}
      <div className="flex gap-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              إضافة مدفوعة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>إضافة مدفوعة إيجار جديدة</DialogTitle>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>العقد *</Label>
                  <Select 
                    value={paymentData.contract_id} 
                    onValueChange={(value) => handleInputChange('contract_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العقد" />
                    </SelectTrigger>
                    <SelectContent>
                      {rentContracts?.map((contract) => (
                        <SelectItem key={contract.id} value={contract.id}>
                          {contract.contract_number} - {contract.property_address}
                          <span className="text-xs text-gray-500 block">
                            ({contract.monthly_rent} {contract.currency} شهرياً)
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>شهر الدفع *</Label>
                  <Input
                    type="month"
                    value={paymentData.payment_month}
                    onChange={(e) => handleInputChange('payment_month', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>تاريخ الاستحقاق *</Label>
                  <Input
                    type="date"
                    value={paymentData.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>المبلغ *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentData.amount}
                    onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>العملة</Label>
                  <Select 
                    value={paymentData.currency} 
                    onValueChange={(value: SupportedCurrency) => handleInputChange('currency', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر العملة" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                      <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                      <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>الحساب البنكي</Label>
                  <Select 
                    value={paymentData.bank_account_id} 
                    onValueChange={(value) => handleInputChange('bank_account_id', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الحساب" />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts?.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.account_name} - {account.bank_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>ملاحظات</Label>
              <Input
                value={paymentData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="ملاحظات إضافية..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                إلغاء
              </Button>
              <Button 
                onClick={handleAddPayment} 
                disabled={isAddingPayment || validationErrors.length > 0}
              >
                {isAddingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  'إضافة المدفوعة'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* جدول المدفوعات */}
      <Card>
        <CardHeader>
          <CardTitle>مدفوعات الإيجار</CardTitle>
        </CardHeader>
        <CardContent>
          {!rentPayments || rentPayments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">لا توجد مدفوعات إيجار مسجلة حتى الآن</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>العقد</TableHead>
                  <TableHead>الشهر</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>تاريخ الدفع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>العمليات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rentPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {payment.contract?.contract_number || 'غير محدد'}
                      <div className="text-xs text-gray-500">
                        {payment.contract?.property_address}
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(payment.payment_month + '-01').toLocaleDateString('ar-SA', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </TableCell>
                    <TableCell>
                      <div>
                        {payment.amount.toLocaleString()} {payment.currency}
                      </div>
                      {payment.currency !== 'EGP' && (
                        <div className="text-xs text-gray-500">
                          <EgyptianPoundDisplay amount={payment.amount_egp || payment.amount} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(payment.due_date).toLocaleDateString('ar-SA')}
                    </TableCell>
                    <TableCell>
                      {payment.payment_date ? 
                        new Date(payment.payment_date).toLocaleDateString('ar-SA') : 
                        '--'
                      }
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status, payment.due_date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {payment.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleStatusUpdate(payment.id, 'paid')}
                            disabled={isUpdatingPayment}
                          >
                            {isUpdatingPayment ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'تسديد'
                            )}
                          </Button>
                        )}
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

export default ImprovedRentPaymentManagement;
