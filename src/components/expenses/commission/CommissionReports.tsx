
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Download, TrendingUp } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { usePeriodCommissions } from '@/hooks/usePeriodCommissions';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';

const CommissionReports = () => {
  const { employees } = useExpenses();
  const { commissionPeriods } = usePeriodCommissions();
  const [reportType, setReportType] = useState('monthly');
  const [selectedPeriod, setSelectedPeriod] = useState(new Date().toISOString().slice(0, 7));
  const [selectedEmployee, setSelectedEmployee] = useState('');

  const filteredCommissions = commissionPeriods?.filter(commission => {
    const matchesEmployee = !selectedEmployee || commission.employee_id === selectedEmployee;
    const commissionDate = new Date(commission.created_at);
    
    let matchesPeriod = true;
    if (reportType === 'monthly') {
      const periodMonth = selectedPeriod.slice(0, 7);
      const commissionMonth = commissionDate.toISOString().slice(0, 7);
      matchesPeriod = commissionMonth === periodMonth;
    }
    
    return matchesEmployee && matchesPeriod;
  });

  // تجميع العمولات حسب الموظف
  const employeeCommissionSummary = employees?.map(employee => {
    const employeeCommissions = filteredCommissions?.filter(c => c.employee_id === employee.id) || [];
    const totalCommissions = employeeCommissions.reduce((sum, c) => sum + c.commission_amount, 0);
    const pendingCommissions = employeeCommissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.commission_amount, 0);
    const paidCommissions = employeeCommissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.commission_amount, 0);
    
    return {
      employee,
      totalCommissions,
      pendingCommissions,
      paidCommissions,
      commissionsCount: employeeCommissions.length,
      totalBookings: employeeCommissions.reduce((sum, c) => sum + c.total_bookings_count, 0)
    };
  }).filter(summary => summary.totalCommissions > 0) || [];

  const totalAllCommissions = employeeCommissionSummary.reduce((sum, summary) => sum + summary.totalCommissions, 0);
  const totalPendingCommissions = employeeCommissionSummary.reduce((sum, summary) => sum + summary.pendingCommissions, 0);
  const totalPaidCommissions = employeeCommissionSummary.reduce((sum, summary) => sum + summary.paidCommissions, 0);

  return (
    <div className="space-y-6">
      {/* فلاتر التقرير */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تقارير عمولات الموظفين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>نوع التقرير</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">تقرير شهري</SelectItem>
                  <SelectItem value="quarterly">تقرير ربع سنوي</SelectItem>
                  <SelectItem value="yearly">تقرير سنوي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>الفترة</Label>
              <Input
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              />
            </div>

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
              <Label>&nbsp;</Label>
              <Button className="w-full">
                <Download className="h-4 w-4 mr-2" />
                تصدير التقرير
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ملخص إجمالي */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">إجمالي العمولات</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                <MultiCurrencyDisplay amount={totalAllCommissions} currency="EGP" showInEGP={false} />
              </p>
              <p className="text-sm text-gray-500 mt-1">جميع العمولات</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">العمولات المعلقة</h3>
              <p className="text-3xl font-bold text-orange-600 mt-2">
                <MultiCurrencyDisplay amount={totalPendingCommissions} currency="EGP" showInEGP={false} />
              </p>
              <p className="text-sm text-gray-500 mt-1">لم يتم دفعها بعد</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">العمولات المدفوعة</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                <MultiCurrencyDisplay amount={totalPaidCommissions} currency="EGP" showInEGP={false} />
              </p>
              <p className="text-sm text-gray-500 mt-1">تم دفعها</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول ملخص عمولات الموظفين */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            ملخص عمولات الموظفين - {selectedPeriod}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>الكود</TableHead>
                <TableHead>معدل العمولة</TableHead>
                <TableHead>عدد الفترات</TableHead>
                <TableHead>عدد الحجوزات</TableHead>
                <TableHead>إجمالي العمولات</TableHead>
                <TableHead>العمولات المعلقة</TableHead>
                <TableHead>العمولات المدفوعة</TableHead>
                <TableHead>الأداء</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeCommissionSummary.map((summary) => (
                <TableRow key={summary.employee.id}>
                  <TableCell className="font-medium">
                    {summary.employee.full_name}
                  </TableCell>
                  <TableCell>{summary.employee.employee_code}</TableCell>
                  <TableCell>{summary.employee.commission_rate || 0}%</TableCell>
                  <TableCell>{summary.commissionsCount}</TableCell>
                  <TableCell>{summary.totalBookings}</TableCell>
                  <TableCell className="font-semibold text-blue-600">
                    <MultiCurrencyDisplay 
                      amount={summary.totalCommissions} 
                      currency="EGP" 
                      showInEGP={false} 
                    />
                  </TableCell>
                  <TableCell className="text-orange-600">
                    <MultiCurrencyDisplay 
                      amount={summary.pendingCommissions} 
                      currency="EGP" 
                      showInEGP={false} 
                    />
                  </TableCell>
                  <TableCell className="text-green-600">
                    <MultiCurrencyDisplay 
                      amount={summary.paidCommissions} 
                      currency="EGP" 
                      showInEGP={false} 
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500" 
                          style={{ 
                            width: `${summary.totalCommissions > 0 ? Math.min((summary.paidCommissions / summary.totalCommissions) * 100, 100) : 0}%` 
                          }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">
                        {summary.totalCommissions > 0 ? Math.round((summary.paidCommissions / summary.totalCommissions) * 100) : 0}%
                      </span>
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

export default CommissionReports;
