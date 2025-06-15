
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';

const SalaryReports = () => {
  const { monthlySalaries, employees, salariesLoading } = useExpenses();
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));

  const filteredSalaries = monthlySalaries?.filter(salary => 
    salary.salary_month.startsWith(filterMonth)
  );

  const totalNetSalaries = filteredSalaries?.reduce((sum, salary) => sum + salary.net_salary, 0) || 0;
  const totalGrossSalaries = filteredSalaries?.reduce((sum, salary) => sum + salary.gross_salary, 0) || 0;
  const totalDeductions = filteredSalaries?.reduce((sum, salary) => 
    sum + salary.tax_amount + salary.insurance_deduction + salary.deductions, 0) || 0;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'معلق', variant: 'secondary' as const },
      paid: { label: 'مدفوع', variant: 'default' as const },
      cancelled: { label: 'ملغي', variant: 'destructive' as const }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (salariesLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      {/* فلاتر التقرير */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            تقارير الرواتب
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <Label>شهر التقرير</Label>
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
              />
            </div>
            <Button>
              <Download className="h-4 w-4 mr-2" />
              تصدير التقرير
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ملخص الرواتب */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">إجمالي الرواتب الصافية</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                {totalNetSalaries.toLocaleString()} ريال
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">إجمالي الرواتب الإجمالية</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                {totalGrossSalaries.toLocaleString()} ريال
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">إجمالي الاستقطاعات</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">
                {totalDeductions.toLocaleString()} ريال
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول تفاصيل الرواتب */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل رواتب الموظفين - {filterMonth}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>الراتب الأساسي</TableHead>
                <TableHead>البدلات</TableHead>
                <TableHead>الساعات الإضافية</TableHead>
                <TableHead>المكافآت</TableHead>
                <TableHead>الإجمالي</TableHead>
                <TableHead>الاستقطاعات</TableHead>
                <TableHead>الصافي</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>العمليات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalaries?.map((salary) => {
                const employee = employees?.find(emp => emp.id === salary.employee_id);
                return (
                  <TableRow key={salary.id}>
                    <TableCell className="font-medium">
                      {employee?.full_name || 'غير محدد'}
                    </TableCell>
                    <TableCell>{salary.base_salary.toLocaleString()}</TableCell>
                    <TableCell>{salary.allowances.toLocaleString()}</TableCell>
                    <TableCell>{salary.overtime_amount.toLocaleString()}</TableCell>
                    <TableCell>{salary.bonus.toLocaleString()}</TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      {salary.gross_salary.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-red-600">
                      {(salary.tax_amount + salary.insurance_deduction + salary.deductions).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {salary.net_salary.toLocaleString()}
                    </TableCell>
                    <TableCell>{getStatusBadge(salary.status)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryReports;
