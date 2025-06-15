
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calculator, Eye, DollarSign } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useEmployeeCommissions } from '@/hooks/useEmployeeCommissions';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';

const CommissionCalculation = () => {
  const { employees, employeesLoading } = useExpenses();
  const { commissions, commissionsLoading } = useEmployeeCommissions();
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().slice(0, 7) + '-01',
    end: new Date().toISOString().slice(0, 10)
  });

  const filteredCommissions = commissions?.filter(commission => {
    const matchesEmployee = !selectedEmployee || commission.employee_id === selectedEmployee;
    const commissionDate = new Date(commission.commission_date);
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    const matchesDate = commissionDate >= startDate && commissionDate <= endDate;
    
    return matchesEmployee && matchesDate;
  });

  const totalCommissions = filteredCommissions?.reduce((sum, commission) => 
    sum + commission.commission_amount, 0
  ) || 0;

  const pendingCommissions = filteredCommissions?.filter(c => c.payment_status === 'pending') || [];
  const paidCommissions = filteredCommissions?.filter(c => c.payment_status === 'paid') || [];

  const getBookingTypeLabel = (type: string) => {
    const types = {
      hotel: 'حجز فندقي',
      flight: 'حجز طيران',
      transport: 'حجز نقل',
      car_rental: 'إيجار سيارة'
    };
    return types[type as keyof typeof types] || type;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'معلق', variant: 'secondary' as const },
      paid: { label: 'مدفوع', variant: 'default' as const },
      cancelled: { label: 'ملغي', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (employeesLoading || commissionsLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* فلاتر البحث */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            حساب عمولات الموظفين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="جميع الموظفين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">جميع الموظفين</SelectItem>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name} - {employee.employee_code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>من تاريخ</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>إلى تاريخ</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ملخص العمولات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">إجمالي العمولات</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                <MultiCurrencyDisplay amount={totalCommissions} currency="EGP" showInEGP={false} />
              </p>
              <p className="text-sm text-gray-500 mt-1">{filteredCommissions?.length || 0} عملية</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">العمولات المعلقة</h3>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                <MultiCurrencyDisplay 
                  amount={pendingCommissions.reduce((sum, c) => sum + c.commission_amount, 0)} 
                  currency="EGP" 
                  showInEGP={false} 
                />
              </p>
              <p className="text-sm text-gray-500 mt-1">{pendingCommissions.length} عملية</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">العمولات المدفوعة</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                <MultiCurrencyDisplay 
                  amount={paidCommissions.reduce((sum, c) => sum + c.commission_amount, 0)} 
                  currency="EGP" 
                  showInEGP={false} 
                />
              </p>
              <p className="text-sm text-gray-500 mt-1">{paidCommissions.length} عملية</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول تفاصيل العمولات */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل العمولات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>نوع الحجز</TableHead>
                <TableHead>مبلغ الحجز</TableHead>
                <TableHead>معدل العمولة</TableHead>
                <TableHead>مبلغ العمولة</TableHead>
                <TableHead>تاريخ العمولة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>العمليات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCommissions?.map((commission) => (
                <TableRow key={commission.id}>
                  <TableCell className="font-medium">
                    {commission.employee?.full_name || 'غير محدد'}
                  </TableCell>
                  <TableCell>
                    {getBookingTypeLabel(commission.booking_type)}
                  </TableCell>
                  <TableCell>
                    <MultiCurrencyDisplay 
                      amount={commission.booking_amount} 
                      currency={commission.currency as "EGP" | "USD" | "SAR"} 
                      showInEGP={false} 
                    />
                  </TableCell>
                  <TableCell>{commission.commission_rate}%</TableCell>
                  <TableCell className="font-semibold text-green-600">
                    <MultiCurrencyDisplay 
                      amount={commission.commission_amount} 
                      currency={commission.currency as "EGP" | "USD" | "SAR"} 
                      showInEGP={false} 
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(commission.commission_date).toLocaleDateString('ar')}
                  </TableCell>
                  <TableCell>{getStatusBadge(commission.payment_status)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
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

export default CommissionCalculation;
