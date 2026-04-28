
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  DollarSign, 
  Edit, 
  Trash2, 
  CheckCircle, 
  Clock, 
  XCircle,
  Filter,
  AlertCircle,
  Users
} from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { usePeriodCommissions } from '@/hooks/usePeriodCommissions';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';

const PeriodCommissionManagement = () => {
  const [statusFilter, setStatusFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');

  const { employees } = useExpenses();
  const { 
    commissionPeriods, 
    periodsLoading, 
    periodsError,
    updatePeriodCommissionStatus,
    deletePeriodCommission,
    isUpdatingStatus,
    isDeleting
  } = usePeriodCommissions();

  // تصفية البيانات
  const filteredCommissions = commissionPeriods?.filter(commission => {
    const matchesStatus = !statusFilter || commission.status === statusFilter;
    const matchesEmployee = !employeeFilter || commission.employee_id === employeeFilter;
    const matchesPeriod = !selectedPeriod || commission.created_at.includes(selectedPeriod);
    
    return matchesStatus && matchesEmployee && matchesPeriod;
  }) || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" />معلقة</Badge>;
      case 'paid':
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" />مدفوعة</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="h-3 w-3 mr-1" />ملغاة</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleStatusUpdate = (commissionPeriodId: string, newStatus: 'pending' | 'paid' | 'cancelled') => {
    const updateData: any = {
      commissionPeriodId,
      status: newStatus
    };

    if (newStatus === 'paid') {
      updateData.paymentDate = new Date().toISOString().split('T')[0];
      updateData.paymentMethod = 'bank_transfer';
    }

    updatePeriodCommissionStatus(updateData);
  };

  const handleDelete = (commissionPeriodId: string) => {
    if (confirm('هل أنت متأكد من حذف فترة العمولة هذه؟')) {
      deletePeriodCommission(commissionPeriodId);
    }
  };

  if (periodsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">جاري تحميل فترات العمولات...</div>
        </CardContent>
      </Card>
    );
  }

  if (periodsError) {
    return (
      <Card>
        <CardContent className="p-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              حدث خطأ في تحميل فترات العمولات: {periodsError.message}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* فلاتر البحث */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            تصفية فترات العمولات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>الحالة</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">معلقة</SelectItem>
                  <SelectItem value="paid">مدفوعة</SelectItem>
                  <SelectItem value="cancelled">ملغاة</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الموظفين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الموظفين</SelectItem>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name} - {employee.employee_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الشهر</Label>
              <Input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <Button 
                variant="outline" 
                onClick={() => {
                  setStatusFilter('');
                  setEmployeeFilter('');
                  setSelectedPeriod('');
                }}
                className="w-full"
              >
                إعادة تعيين الفلاتر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* جدول فترات العمولات */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            إدارة فترات العمولات المجمعة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredCommissions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>لا توجد فترات عمولات تطابق الفلاتر المحددة</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead>الفترة</TableHead>
                  <TableHead>عدد الحجوزات</TableHead>
                  <TableHead>إجمالي الربح</TableHead>
                  <TableHead>معدل العمولة</TableHead>
                  <TableHead>مبلغ العمولة</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>تاريخ الدفع</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCommissions.map((commission) => {
                  const employee = employees?.find(emp => emp.id === commission.employee_id);
                  
                  return (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee?.full_name || 'غير محدد'}</div>
                          <div className="text-sm text-gray-500">{employee?.employee_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{format(new Date(commission.period_start), 'dd/MM/yyyy', { locale: ar })}</div>
                          <div className="text-gray-500">إلى</div>
                          <div>{format(new Date(commission.period_end), 'dd/MM/yyyy', { locale: ar })}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {commission.total_bookings_count}
                      </TableCell>
                      <TableCell>
                        <MultiCurrencyDisplay 
                          amount={commission.total_profit} 
                          currency={commission.currency as 'EGP' | 'USD' | 'EUR'} 
                          showInEGP={false} 
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {commission.commission_rate}%
                      </TableCell>
                      <TableCell className="font-semibold text-green-600">
                        <MultiCurrencyDisplay 
                          amount={commission.commission_amount} 
                          currency={commission.currency as 'EGP' | 'USD' | 'EUR'} 
                          showInEGP={false} 
                        />
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(commission.status)}
                      </TableCell>
                      <TableCell>
                        {commission.payment_date ? 
                          format(new Date(commission.payment_date), 'dd/MM/yyyy', { locale: ar }) : 
                          '-'
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {commission.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleStatusUpdate(commission.id, 'paid')}
                                disabled={isUpdatingStatus}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                دفع
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusUpdate(commission.id, 'cancelled')}
                                disabled={isUpdatingStatus}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <XCircle className="h-3 w-3 mr-1" />
                                إلغاء
                              </Button>
                            </>
                          )}
                          
                          {commission.status === 'paid' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(commission.id, 'pending')}
                              disabled={isUpdatingStatus}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              إرجاع للمعلق
                            </Button>
                          )}
                          
                          {commission.status === 'cancelled' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(commission.id)}
                              disabled={isDeleting}
                              className="text-red-600 border-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              حذف
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PeriodCommissionManagement;
