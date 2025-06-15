import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';
import SalaryBarChart from './SalaryBarChart';
import SalaryDistributionChart from './SalaryDistributionChart';

const SalaryReports = () => {
  const { monthlySalaries, salariesLoading, employees } = useExpenses();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  
  if (salariesLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  const years = [...new Set(monthlySalaries?.map(salary => 
    new Date(salary.salary_month).getFullYear()
  ))].sort((a, b) => b - a);

  const filteredSalaries = monthlySalaries?.filter(salary => 
    new Date(salary.salary_month).getFullYear().toString() === selectedYear
  ) || [];

  const totalPaid = filteredSalaries.reduce((sum, salary) => 
    sum + (salary.net_salary_egp || salary.net_salary), 0
  );

  const totalPending = filteredSalaries
    .filter(salary => salary.status === 'pending')
    .reduce((sum, salary) => sum + (salary.net_salary_egp || salary.net_salary), 0);

  const averageSalary = filteredSalaries.length > 0 
    ? totalPaid / filteredSalaries.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">تقارير الرواتب</h2>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="اختر السنة" />
          </SelectTrigger>
          <SelectContent>
            {years.map(year => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ملخص الرواتب */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي الرواتب المدفوعة</p>
                <p className="text-2xl font-bold text-green-600">
                  <MultiCurrencyDisplay amount={totalPaid} currency="EGP" />
                </p>
                <p className="text-xs text-gray-500 mt-1">{selectedYear}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">الرواتب المعلقة</p>
                <p className="text-2xl font-bold text-orange-600">
                  <MultiCurrencyDisplay amount={totalPending} currency="EGP" />
                </p>
                <p className="text-xs text-gray-500 mt-1">{selectedYear}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">متوسط الراتب</p>
                <p className="text-2xl font-bold text-blue-600">
                  <MultiCurrencyDisplay amount={averageSalary} currency="EGP" />
                </p>
                <p className="text-xs text-gray-500 mt-1">{selectedYear}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تبويبات التقارير */}
      <Tabs defaultValue="monthly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="monthly">تقرير شهري</TabsTrigger>
          <TabsTrigger value="employee">حسب الموظف</TabsTrigger>
          <TabsTrigger value="charts">رسوم بيانية</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الرواتب الشهرية - {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الشهر</TableHead>
                    <TableHead>عدد الموظفين</TableHead>
                    <TableHead>إجمالي الرواتب</TableHead>
                    <TableHead>متوسط الراتب</TableHead>
                    <TableHead>الحالة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Array.from({ length: 12 }, (_, i) => {
                    const month = i + 1;
                    const monthSalaries = filteredSalaries.filter(salary => 
                      new Date(salary.salary_month).getMonth() + 1 === month
                    );
                    const monthTotal = monthSalaries.reduce((sum, salary) => 
                      sum + (salary.net_salary_egp || salary.net_salary), 0
                    );
                    const monthAvg = monthSalaries.length > 0 ? monthTotal / monthSalaries.length : 0;
                    
                    return (
                      <TableRow key={month}>
                        <TableCell>{month}/{ selectedYear}</TableCell>
                        <TableCell>{monthSalaries.length}</TableCell>
                        <TableCell className="font-medium">
                          <MultiCurrencyDisplay amount={monthTotal} currency="EGP" showInEGP={false} />
                        </TableCell>
                        <TableCell>
                          <MultiCurrencyDisplay amount={monthAvg} currency="EGP" showInEGP={false} />
                        </TableCell>
                        <TableCell>
                          {monthSalaries.length > 0 ? (
                            monthSalaries.every(s => s.status === 'paid') ? (
                              <Badge variant="default">مدفوع</Badge>
                            ) : monthSalaries.every(s => s.status === 'pending') ? (
                              <Badge variant="secondary">معلق</Badge>
                            ) : (
                              <Badge variant="outline">مدفوع جزئياً</Badge>
                            )
                          ) : (
                            <Badge variant="secondary">لا يوجد بيانات</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الرواتب حسب الموظف - {selectedYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الموظف</TableHead>
                    <TableHead>المنصب</TableHead>
                    <TableHead>الراتب الأساسي</TableHead>
                    <TableHead>متوسط الراتب الشهري</TableHead>
                    <TableHead>إجمالي المدفوع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees?.map(employee => {
                    const employeeSalaries = filteredSalaries.filter(salary => 
                      salary.employee_id === employee.id
                    );
                    const totalPaid = employeeSalaries.reduce((sum, salary) => 
                      sum + (salary.net_salary_egp || salary.net_salary), 0
                    );
                    const avgSalary = employeeSalaries.length > 0 ? totalPaid / employeeSalaries.length : 0;
                    
                    return (
                      <TableRow key={employee.id}>
                        <TableCell className="font-medium">{employee.full_name}</TableCell>
                        <TableCell>{employee.position}</TableCell>
                        <TableCell>
                          <MultiCurrencyDisplay amount={employee.base_salary} currency="EGP" showInEGP={false} />
                        </TableCell>
                        <TableCell>
                          <MultiCurrencyDisplay amount={avgSalary} currency="EGP" showInEGP={false} />
                        </TableCell>
                        <TableCell className="font-semibold">
                          <MultiCurrencyDisplay amount={totalPaid} currency="EGP" showInEGP={false} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>توزيع الرواتب الشهرية</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <SalaryBarChart salaries={filteredSalaries} />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>توزيع الرواتب حسب المنصب</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <SalaryDistributionChart salaries={filteredSalaries} employees={employees || []} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalaryReports;
