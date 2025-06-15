
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { DollarSign, Plus, CreditCard } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useEmployeeCommissions } from '@/hooks/useEmployeeCommissions';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';
import { toast } from 'sonner';

const CommissionPayments = () => {
  const { employees } = useExpenses();
  const { 
    commissions, 
    commissionPayments,
    addCommissionPayment, 
    markCommissionsAsPaid,
    isAddingPayment,
    isUpdatingStatus
  } = useEmployeeCommissions();
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedCommissions, setSelectedCommissions] = useState<string[]>([]);
  const [paymentData, setPaymentData] = useState({
    payment_period_start: new Date().toISOString().slice(0, 7) + '-01',
    payment_period_end: new Date().toISOString().slice(0, 10),
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: ''
  });

  const pendingCommissions = commissions?.filter(c => 
    c.payment_status === 'pending' && 
    (!selectedEmployee || c.employee_id === selectedEmployee)
  ) || [];

  const totalSelectedAmount = pendingCommissions
    .filter(c => selectedCommissions.includes(c.id))
    .reduce((sum, c) => sum + c.commission_amount, 0);

  const handlePaymentSubmit = async () => {
    if (!selectedEmployee || selectedCommissions.length === 0) {
      toast.error('يرجى اختيار موظف وعمولات للدفع');
      return;
    }

    const payment = {
      employee_id: selectedEmployee,
      payment_period_start: paymentData.payment_period_start,
      payment_period_end: paymentData.payment_period_end,
      total_commission_amount: totalSelectedAmount,
      currency: 'EGP',
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: paymentData.payment_method,
      reference_number: paymentData.reference_number,
      notes: paymentData.notes,
      created_by: 'current-user-id' // سيتم استبداله بمعرف المستخدم الحالي
    };

    try {
      await addCommissionPayment(payment);
      await markCommissionsAsPaid({
        employeeId: selectedEmployee,
        commissionIds: selectedCommissions,
        paymentDate: payment.payment_date
      });
      
      setIsPaymentDialogOpen(false);
      setSelectedCommissions([]);
      setSelectedEmployee('');
      setPaymentData({
        payment_period_start: new Date().toISOString().slice(0, 7) + '-01',
        payment_period_end: new Date().toISOString().slice(0, 10),
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error processing commission payment:', error);
    }
  };

  const handleCommissionSelect = (commissionId: string, checked: boolean) => {
    if (checked) {
      setSelectedCommissions(prev => [...prev, commissionId]);
    } else {
      setSelectedCommissions(prev => prev.filter(id => id !== commissionId));
    }
  };

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">دفع عمولات الموظفين</h2>
        
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              دفع عمولات جديدة
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>دفع عمولات الموظف</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* اختيار الموظف */}
              <div className="space-y-2">
                <Label>الموظف</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر موظف" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees?.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.full_name} - {employee.employee_code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* العمولات المعلقة */}
              {selectedEmployee && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">العمولات المعلقة</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={selectedCommissions.length === pendingCommissions.length && pendingCommissions.length > 0}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedCommissions(pendingCommissions.map(c => c.id));
                                } else {
                                  setSelectedCommissions([]);
                                }
                              }}
                            />
                          </TableHead>
                          <TableHead>نوع الحجز</TableHead>
                          <TableHead>مبلغ الحجز</TableHead>
                          <TableHead>مبلغ العمولة</TableHead>
                          <TableHead>التاريخ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingCommissions.map((commission) => (
                          <TableRow key={commission.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedCommissions.includes(commission.id)}
                                onCheckedChange={(checked) => handleCommissionSelect(commission.id, checked)}
                              />
                            </TableCell>
                            <TableCell>
                              {commission.booking_type === 'hotel' && 'حجز فندقي'}
                              {commission.booking_type === 'flight' && 'حجز طيران'}
                              {commission.booking_type === 'transport' && 'حجز نقل'}
                              {commission.booking_type === 'car_rental' && 'إيجار سيارة'}
                            </TableCell>
                            <TableCell>
                              <MultiCurrencyDisplay 
                                amount={commission.booking_amount} 
                                currency={commission.currency} 
                                showInEGP={false} 
                              />
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              <MultiCurrencyDisplay 
                                amount={commission.commission_amount} 
                                currency={commission.currency} 
                                showInEGP={false} 
                              />
                            </TableCell>
                            <TableCell>
                              {new Date(commission.commission_date).toLocaleDateString('ar')}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {selectedCommissions.length > 0 && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">إجمالي المبلغ المحدد:</span>
                          <span className="text-xl font-bold text-blue-600">
                            <MultiCurrencyDisplay amount={totalSelectedAmount} currency="EGP" showInEGP={false} />
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* تفاصيل الدفع */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>من تاريخ</Label>
                  <Input
                    type="date"
                    value={paymentData.payment_period_start}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, payment_period_start: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>إلى تاريخ</Label>
                  <Input
                    type="date"
                    value={paymentData.payment_period_end}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, payment_period_end: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>طريقة الدفع</Label>
                  <Select value={paymentData.payment_method} onValueChange={(value) => setPaymentData(prev => ({ ...prev, payment_method: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>رقم المرجع</Label>
                  <Input
                    value={paymentData.reference_number}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, reference_number: e.target.value }))}
                    placeholder="رقم التحويل أو المرجع"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="ملاحظات إضافية حول الدفع"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handlePaymentSubmit} 
                  disabled={!selectedEmployee || selectedCommissions.length === 0 || isAddingPayment || isUpdatingStatus}
                  className="flex items-center gap-2"
                >
                  <CreditCard className="h-4 w-4" />
                  {isAddingPayment || isUpdatingStatus ? 'جاري المعالجة...' : 'تأكيد الدفع'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsPaymentDialogOpen(false)}
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* جدول مدفوعات العمولات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            سجل مدفوعات العمولات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>فترة الدفع</TableHead>
                <TableHead>المبلغ الإجمالي</TableHead>
                <TableHead>تاريخ الدفع</TableHead>
                <TableHead>طريقة الدفع</TableHead>
                <TableHead>رقم المرجع</TableHead>
                <TableHead>الملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissionPayments?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.employee?.full_name || 'غير محدد'}
                  </TableCell>
                  <TableCell>
                    {new Date(payment.payment_period_start).toLocaleDateString('ar')} - {new Date(payment.payment_period_end).toLocaleDateString('ar')}
                  </TableCell>
                  <TableCell className="font-semibold text-green-600">
                    <MultiCurrencyDisplay 
                      amount={payment.total_commission_amount} 
                      currency={payment.currency} 
                      showInEGP={false} 
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(payment.payment_date).toLocaleDateString('ar')}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {payment.payment_method === 'bank_transfer' && 'تحويل بنكي'}
                      {payment.payment_method === 'cash' && 'نقدي'}
                      {payment.payment_method === 'check' && 'شيك'}
                    </Badge>
                  </TableCell>
                  <TableCell>{payment.reference_number || '-'}</TableCell>
                  <TableCell>{payment.notes || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default CommissionPayments;
