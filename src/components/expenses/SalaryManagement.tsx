
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Calculator, Eye } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';

const SalaryManagement = () => {
  const { 
    employees, 
    monthlySalaries, 
    calculateMonthlySalary, 
    isCalculatingSalary,
    employeesLoading,
    salariesLoading
  } = useExpenses();

  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [salaryMonth, setSalaryMonth] = useState('');
  const [overtimeHours, setOvertimeHours] = useState(0);
  const [overtimeRate, setOvertimeRate] = useState(0);
  const [deductions, setDeductions] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [insuranceDeduction, setInsuranceDeduction] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCalculateSalary = () => {
    if (!selectedEmployee || !salaryMonth) return;

    const employee = employees?.find(emp => emp.id === selectedEmployee);
    if (!employee) return;

    calculateMonthlySalary({
      employee_id: selectedEmployee,
      salary_month: salaryMonth,
      base_salary: employee.base_salary,
      allowances: employee.allowances,
      overtime_hours: overtimeHours,
      overtime_rate: overtimeRate,
      deductions,
      bonus,
      tax_amount: taxAmount,
      insurance_deduction: insuranceDeduction,
      status: 'pending'
    });

    setIsDialogOpen(false);
    // Reset form
    setSelectedEmployee('');
    setSalaryMonth('');
    setOvertimeHours(0);
    setOvertimeRate(0);
    setDeductions(0);
    setBonus(0);
    setTaxAmount(0);
    setInsuranceDeduction(0);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: 'في الانتظار', variant: 'secondary' as const },
      paid: { label: 'مدفوع', variant: 'default' as const },
      cancelled: { label: 'ملغى', variant: 'destructive' as const }
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  if (employeesLoading || salariesLoading) {
    return <div className="flex justify-center items-center h-64">جاري التحميل...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              إدارة الرواتب الشهرية
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  حساب راتب شهري
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>حساب الراتب الشهري</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>الموظف</Label>
                    <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر الموظف" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees?.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.full_name} - {employee.position}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>الشهر</Label>
                    <Input
                      type="month"
                      value={salaryMonth}
                      onChange={(e) => setSalaryMonth(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ساعات إضافية</Label>
                    <Input
                      type="number"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(Number(e.target.value))}
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>سعر الساعة الإضافية</Label>
                    <Input
                      type="number"
                      value={overtimeRate}
                      onChange={(e) => setOvertimeRate(Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>استقطاعات</Label>
                    <Input
                      type="number"
                      value={deductions}
                      onChange={(e) => setDeductions(Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>مكافآت</Label>
                    <Input
                      type="number"
                      value={bonus}
                      onChange={(e) => setBonus(Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>ضرائب</Label>
                    <Input
                      type="number"
                      value={taxAmount}
                      onChange={(e) => setTaxAmount(Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>استقطاع التأمين</Label>
                    <Input
                      type="number"
                      value={insuranceDeduction}
                      onChange={(e) => setInsuranceDeduction(Number(e.target.value))}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button 
                    onClick={handleCalculateSalary}
                    disabled={!selectedEmployee || !salaryMonth || isCalculatingSalary}
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    {isCalculatingSalary ? 'جاري الحساب...' : 'حساب الراتب'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-right p-3">الموظف</th>
                  <th className="text-right p-3">الشهر</th>
                  <th className="text-right p-3">الراتب الأساسي</th>
                  <th className="text-right p-3">الراتب الإجمالي</th>
                  <th className="text-right p-3">الراتب الصافي</th>
                  <th className="text-right p-3">الحالة</th>
                  <th className="text-right p-3">العمليات</th>
                </tr>
              </thead>
              <tbody>
                {monthlySalaries?.map((salary) => (
                  <tr key={salary.id} className="border-b hover:bg-gray-50">
                    <td className="p-3">
                      <div>
                        <div className="font-medium">{salary.employee?.full_name}</div>
                        <div className="text-sm text-gray-500">{salary.employee?.position}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      {new Date(salary.salary_month).toLocaleDateString('ar-SA', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </td>
                    <td className="p-3">{salary.base_salary.toLocaleString()} ر.س</td>
                    <td className="p-3">{salary.gross_salary.toLocaleString()} ر.س</td>
                    <td className="p-3 font-medium">{salary.net_salary.toLocaleString()} ر.س</td>
                    <td className="p-3">
                      <Badge variant={getStatusBadge(salary.status).variant}>
                        {getStatusBadge(salary.status).label}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SalaryManagement;
