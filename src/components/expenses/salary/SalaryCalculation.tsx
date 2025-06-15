
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Save, Eye } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useSalarySettings } from '@/hooks/useSalarySettings';
import { useAttendance } from '@/hooks/useAttendance';
import { toast } from 'sonner';

const SalaryCalculation = () => {
  const { employees, monthlySalaries, calculateMonthlySalary, isCalculatingSalary } = useExpenses();
  const { getSetting } = useSalarySettings();
  const { getAttendanceSummary } = useAttendance();
  
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7));
  const [salaryData, setSalaryData] = useState({
    overtime_hours: 0,
    bonus: 0,
    deductions: 0,
    notes: ''
  });
  const [calculatedSalary, setCalculatedSalary] = useState(null);

  const handleCalculateSalary = async () => {
    if (!selectedEmployee) {
      toast.error('يرجى اختيار موظف');
      return;
    }

    try {
      const employee = employees?.find(emp => emp.id === selectedEmployee);
      if (!employee) return;

      // جلب ملخص الحضور للشهر المحدد
      const attendanceSummary = await getAttendanceSummary(selectedEmployee, salaryMonth + '-01');
      
      // حساب المعدلات من الإعدادات
      const taxRate = parseFloat(getSetting('tax_rate'));
      const insuranceRate = parseFloat(getSetting('insurance_rate'));
      const overtimeMultiplier = parseFloat(getSetting('overtime_multiplier'));
      
      // حساب راتب الساعة
      const workingHoursPerMonth = parseFloat(getSetting('working_days_per_month')) * parseFloat(getSetting('working_hours_per_day'));
      const hourlyRate = employee.base_salary / workingHoursPerMonth;
      
      // حساب مبلغ الساعات الإضافية
      const overtimeAmount = (salaryData.overtime_hours + attendanceSummary.overtime_hours) * hourlyRate * overtimeMultiplier;
      
      // حساب الراتب الإجمالي
      const grossSalary = employee.base_salary + employee.allowances + overtimeAmount + salaryData.bonus;
      
      // حساب الاستقطاعات
      const taxAmount = grossSalary * (taxRate / 100);
      const insuranceDeduction = employee.base_salary * (insuranceRate / 100);
      
      // حساب الراتب الصافي
      const netSalary = grossSalary - salaryData.deductions - taxAmount - insuranceDeduction;

      const calculatedData = {
        employee_id: selectedEmployee,
        salary_month: salaryMonth + '-01',
        base_salary: employee.base_salary,
        allowances: employee.allowances,
        overtime_hours: salaryData.overtime_hours + attendanceSummary.overtime_hours,
        overtime_rate: hourlyRate * overtimeMultiplier,
        overtime_amount: overtimeAmount,
        bonus: salaryData.bonus,
        deductions: salaryData.deductions,
        gross_salary: grossSalary,
        tax_amount: taxAmount,
        insurance_deduction: insuranceDeduction,
        net_salary: netSalary,
        attendance_days: attendanceSummary.present_days,
        absence_days: attendanceSummary.absent_days,
        late_hours: attendanceSummary.late_hours,
        notes: salaryData.notes
      };

      setCalculatedSalary(calculatedData);
      toast.success('تم حساب الراتب بنجاح');
    } catch (error) {
      console.error('Error calculating salary:', error);
      toast.error('حدث خطأ في حساب الراتب');
    }
  };

  const handleSaveSalary = async () => {
    if (!calculatedSalary) {
      toast.error('يرجى حساب الراتب أولاً');
      return;
    }

    try {
      await calculateMonthlySalary(calculatedSalary);
      toast.success('تم حفظ الراتب بنجاح');
      setCalculatedSalary(null);
      setSalaryData({ overtime_hours: 0, bonus: 0, deductions: 0, notes: '' });
    } catch (error) {
      console.error('Error saving salary:', error);
      toast.error('حدث خطأ في حفظ الراتب');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            حساب راتب الموظف
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employee">الموظف</Label>
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

          <div className="space-y-2">
            <Label htmlFor="month">شهر الراتب</Label>
            <Input
              id="month"
              type="month"
              value={salaryMonth}
              onChange={(e) => setSalaryMonth(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="overtime">ساعات إضافية إضافية</Label>
            <Input
              id="overtime"
              type="number"
              step="0.5"
              value={salaryData.overtime_hours}
              onChange={(e) => setSalaryData(prev => ({ ...prev, overtime_hours: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bonus">المكافآت</Label>
            <Input
              id="bonus"
              type="number"
              step="0.01"
              value={salaryData.bonus}
              onChange={(e) => setSalaryData(prev => ({ ...prev, bonus: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deductions">الاستقطاعات الإضافية</Label>
            <Input
              id="deductions"
              type="number"
              step="0.01"
              value={salaryData.deductions}
              onChange={(e) => setSalaryData(prev => ({ ...prev, deductions: parseFloat(e.target.value) || 0 }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Input
              id="notes"
              value={salaryData.notes}
              onChange={(e) => setSalaryData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <Button 
            onClick={handleCalculateSalary}
            className="w-full"
            disabled={!selectedEmployee}
          >
            <Calculator className="h-4 w-4 mr-2" />
            حساب الراتب
          </Button>
        </CardContent>
      </Card>

      {calculatedSalary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              تفاصيل الراتب المحسوب
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-gray-600">الراتب الأساسي</Label>
                <p className="font-semibold">{calculatedSalary.base_salary.toLocaleString()} ريال</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">البدلات</Label>
                <p className="font-semibold">{calculatedSalary.allowances.toLocaleString()} ريال</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">الساعات الإضافية</Label>
                <p className="font-semibold">{calculatedSalary.overtime_amount.toLocaleString()} ريال</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">المكافآت</Label>
                <p className="font-semibold">{calculatedSalary.bonus.toLocaleString()} ريال</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">الراتب الإجمالي</Label>
                <p className="font-semibold text-blue-600">{calculatedSalary.gross_salary.toLocaleString()} ريال</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">الضرائب</Label>
                <p className="font-semibold text-red-600">-{calculatedSalary.tax_amount.toLocaleString()} ريال</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">التأمين</Label>
                <p className="font-semibold text-red-600">-{calculatedSalary.insurance_deduction.toLocaleString()} ريال</p>
              </div>
              <div>
                <Label className="text-sm text-gray-600">استقطاعات أخرى</Label>
                <p className="font-semibold text-red-600">-{calculatedSalary.deductions.toLocaleString()} ريال</p>
              </div>
            </div>
            
            <div className="border-t pt-3">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">الراتب الصافي</Label>
                <p className="text-xl font-bold text-green-600">{calculatedSalary.net_salary.toLocaleString()} ريال</p>
              </div>
            </div>

            <Button 
              onClick={handleSaveSalary}
              className="w-full"
              disabled={isCalculatingSalary}
            >
              <Save className="h-4 w-4 mr-2" />
              حفظ الراتب
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SalaryCalculation;
