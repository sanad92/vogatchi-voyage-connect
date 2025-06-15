import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, CreditCard, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { useRentPayments } from '@/hooks/useRentPayments';
import { useRentContracts } from '@/hooks/useRentContracts';
import { useBankAccounts } from '@/hooks/useBankAccounts';
import { SupportedCurrency } from '@/types/currency';

const RentPaymentManagement = () => {
  const { rentPayments, paymentsLoading, addRentPayment, isAddingPayment, updatePaymentStatus } = useRentPayments();
  const { rentContracts } = useRentContracts();
  const { bankAccounts } = useBankAccounts();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paymentData, setPaymentData] = useState({
    contract_id: '',
    payment_month: new Date().toISOString().slice(0, 7),
    amount: 0,
    currency: 'EGP' as SupportedCurrency,
    due_date: '',
    payment_method: 'bank_transfer',
    bank_account_id: '',
    notes: ''
  });

  const handleAddPayment = async () => {
    if (!paymentData.contract_id || !paymentData.due_date) return;

    const contract = rentContracts?.find((c) => c.id === paymentData.contract_id);
    const payment = {
      payment_month: paymentData.payment_month,
      status: 'pending',
      late_fee: 0,
      contract_id: paymentData.contract_id,
      amount: paymentData.amount,
      currency: paymentData.currency,
      due_date: paymentData.due_date,
      payment_method: paymentData.payment_method,
      bank_account_id: paymentData.bank_account_id,
      notes: paymentData.notes,
      created_by: 'current-user-id'
    };

    await addRentPayment(payment);
    
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
  };

  const handleStatusUpdate = async (id: string, status: any) => {
    await updatePaymentStatus({
      id,
      status,
      payment_date: status === 'paid' ? new Date().toISOString().slice(0, 10) : undefined
    });
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

  const pendingPayments = rentPayments?.filter(p => p.status === 'pending') || [];
  const overduePayments = rentPayments?.filter(p => 
    p.status === 'pending' && new Date(p.due_date) < new Date()
  ) || [];
  const totalPending = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  if (paymentsLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">المدفوعات المعلقة</p>
                <p className="text-2xl font-bold">{pendingPayments.length}</p>
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
                <p className="text-2xl font-bold">{overduePayments.length}</p>
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
                <p className="text-2xl font-bold">{totalPending.toLocaleString()} ج.م</p>
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
                  {rentPayments?.filter(p => 
                    p.status === 'paid' && 
                    new Date(p.payment_date || '').getMonth() === new Date().getMonth()
                  ).reduce((sum, p) => sum + p.amount, 0).toLocaleString() || 0} ج.م
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* أزرار الإجراءات */}
      <div className="flex gap-4">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              إضافة مدفوعة جديدة
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>إضافة مدفوعة إيجار جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>العقد</Label>
                <Select value={paymentData.contract_id} onValueChange={(value) => setPaymentData({...paymentData, contract_id: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر العقد" />
                  </SelectTrigger>
                  <SelectContent>
                    {rentContracts?.map((contract) => (
                      <SelectItem key={contract.id} value={contract.id}>
                        {contract.contract_number} - {contract.property_address}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>شهر الدفع</Label>
                  <Input
                    type="month"
                    value={paymentData.payment_month}
                    onChange={(e) => setPaymentData({...paymentData, payment_month: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>تاريخ الاستحقاق</Label>
                  <Input
                    type="date"
                    value={paymentData.due_date}
                    onChange={(e) => setPaymentData({...paymentData, due_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>المبلغ</Label>
                  <Input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>العملة</Label>
                  <Select value={paymentData.currency} onValueChange={(value: SupportedCurrency) => setPaymentData({...paymentData, currency: value})}>
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
              </div>

              <div className="space-y-2">
                <Label>الحساب البنكي</Label>
                <Select value={paymentData.bank_account_id} onValueChange={(value) => setPaymentData({...paymentData, bank_account_id: value})}>
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

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button onClick={handleAddPayment} disabled={isAddingPayment}>
                  {isAddingPayment ? 'جاري الإضافة...' : 'إضافة المدفوعة'}
                </Button>
              </div>
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
              {rentPayments?.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">
                    {payment.contract?.contract_number || 'غير محدد'}
                  </TableCell>
                  <TableCell>
                    {new Date(payment.payment_month).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' })}
                  </TableCell>
                  <TableCell>{payment.amount.toLocaleString()} {payment.currency}</TableCell>
                  <TableCell>{new Date(payment.due_date).toLocaleDateString('ar-SA')}</TableCell>
                  <TableCell>
                    {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('ar-SA') : '--'}
                  </TableCell>
                  <TableCell>{getStatusBadge(payment.status, payment.due_date)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {payment.status === 'pending' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusUpdate(payment.id, 'paid')}
                        >
                          تسديد
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default RentPaymentManagement;
