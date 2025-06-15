
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Eye } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

const SalaryReports = () => {
  const { monthlySalaries, employees, salariesLoading } = useExpenses();
  const { convertToPrimaryCurrency } = useExchangeRates();
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [totals, setTotals] = useState({ totalNet: 0, totalGross: 0, totalDeductions: 0 });

  const filteredSalaries = monthlySalaries?.filter(salary => 
    salary.salary_month.startsWith(filterMonth)
  );

  // حساب الإجماليات بالجنيه المصري
  const calculateTotalsInEGP = async () => {
    if (!filteredSalaries) return { totalNet: 0, totalGross: 0, totalDeductions: 0 };

    let totalNet = 0;
    let totalGross = 0;
    let totalDeductions = 0;

    for (const salary of filteredSalaries) {
      // تحويل الرواتب إلى الجنيه المصري إذا لزم الأمر
      const netInEGP = salary.currency && salary.currency !== 'EGP' 
        ? await convertToPrimaryCurrency(salary.net_salary, salary.currency)
        : salary.net_salary;
      
      const grossInEGP = salary.currency && salary.currency !== 'EGP'
        ? await convertToPrimaryCurrency(salary.gross_salary, salary.currency)
        : salary.gross_salary;

      const deductionsInEGP = salary.currency && salary.currency !== 'EGP'
        ? await convertToPrimaryCurrency(salary.tax_amount + salary.insurance_deduction + salary.deductions, salary.currency)
        : salary.tax_amount + salary.insurance_deduction + salary.deductions;

      totalNet += netInEGP;
      totalGross += grossInEGP;
      totalDeductions += deductionsInEGP;
    }

    return { totalNet, totalGross, totalDeductions };
  };

  // حساب الإجماليات عند تغيير البيانات
  useEffect(() => {
    if (filteredSalaries) {
      calculateTotalsInEGP().then(setTotals);
    }
  }, [filteredSalaries]);

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
            تقارير الرواتب - العملة الأساسية: الجنيه المصري
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

      {/* ملخص الرواتب بالجنيه المصري */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">إجمالي الرواتب الصافية</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">
                <EgyptianPoundDisplay amount={totals.totalNet} />
              </p>
              <p className="text-sm text-gray-500 mt-1">بالجنيه المصري</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">إجمالي الرواتب الإجمالية</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">
                <EgyptianPoundDisplay amount={totals.totalGross} />
              </p>
              <p className="text-sm text-gray-500 mt-1">بالجنيه المصري</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900">إجمالي الاستقطاعات</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">
                <EgyptianPoundDisplay amount={totals.totalDeductions} />
              </p>
              <p className="text-sm text-gray-500 mt-1">بالجنيه المصري</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* جدول تفاصيل الرواتب */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل رواتب الموظفين - {filterMonth} (المبالغ بالجنيه المصري)</CardTitle>
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
                <TableHead>العملة الأصلية</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>العمليات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalaries?.map((salary) => {
                const employee = employees?.find(emp => emp.id === salary.employee_id);
                const originalCurrency = salary.currency || 'EGP';
                
                return (
                  <TableRow key={salary.id}>
                    <TableCell className="font-medium">
                      {employee?.full_name || 'غير محدد'}
                    </TableCell>
                    <TableCell>
                      <MultiCurrencyDisplay 
                        amount={salary.base_salary} 
                        currency="EGP"
                        showInEGP={false}
                      />
                    </TableCell>
                    <TableCell>
                      <MultiCurrencyDisplay 
                        amount={salary.allowances} 
                        currency="EGP"
                        showInEGP={false}
                      />
                    </TableCell>
                    <TableCell>
                      <MultiCurrencyDisplay 
                        amount={salary.overtime_amount} 
                        currency="EGP"
                        showInEGP={false}
                      />
                    </TableCell>
                    <TableCell>
                      <MultiCurrencyDisplay 
                        amount={salary.bonus} 
                        currency="EGP"
                        showInEGP={false}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-blue-600">
                      <MultiCurrencyDisplay 
                        amount={salary.gross_salary} 
                        currency="EGP"
                        showInEGP={false}
                      />
                    </TableCell>
                    <TableCell className="text-red-600">
                      <MultiCurrencyDisplay 
                        amount={salary.tax_amount + salary.insurance_deduction + salary.deductions} 
                        currency="EGP"
                        showInEGP={false}
                      />
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      <MultiCurrencyDisplay 
                        amount={salary.net_salary} 
                        currency="EGP"
                        showInEGP={false}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {originalCurrency}
                      </Badge>
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
