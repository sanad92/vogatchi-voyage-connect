
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Save, Eye, AlertCircle } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useSalarySettings } from '@/hooks/useSalarySettings';
import { useAttendance } from '@/hooks/useAttendance';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [calculatedSalary, setCalculatedSalary] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculateSalary = async () => {
    if (!selectedEmployee) {
      toast.error('يرجى اختيار موظف');
      return;
    }

    setIsCalculating(true);
    
    try {
      const employee = employees?.find(emp => emp.id === selectedEmployee);
      if (!employee) {
        toast.error('لم يتم العثور على بيانات الموظف');
        return;
      }

      // التحقق من وجود راتب محسوب مسبقاً لنفس الشهر
      const existingSalary = monthlySalaries?.find(
        salary => salary.employee_id === selectedEmployee && 
        salary.salary_month.startsWith(salaryMonth)
      );

      if (existingSalary) {
        toast.error('تم حساب راتب هذا الموظف لهذا الشهر مسبقاً');
        return;
      }

      let attendanceSummary = {
        present_days: 0,
        absent_days: 0,
        late_hours: 0,
        overtime_hours: 0
      };

      // محاولة جلب ملخص الحضور
      try {
        if (getAttendanceSummary) {
          attendanceSummary = await getAttendanceSummary(selectedEmployee, salaryMonth + '-01');
        }
      } catch (error) {
        console.warn('Could not fetch attendance summary, using defaults:', error);
      }
      
      // حساب المعدلات من الإعدادات أو استخدام قيم افتراضية
      const taxRate = getSetting ? parseFloat(getSetting('tax_rate') || '0') : 0;
      const insuranceRate = getSetting ? parseFloat(getSetting('insurance_rate') || '0') : 0;
      const overtimeMultiplier = getSetting ? parseFloat(getSetting('overtime_multiplier') || '1.5') : 1.5;
      const workingDaysPerMonth = getSetting ? parseFloat(getSetting('working_days_per_month') || '30') : 30;
      const workingHoursPerDay = getSetting ? parseFloat(getSetting('working_hours_per_day') || '8') : 8;
      
      // حساب راتب الساعة
      const workingHoursPerMonth = workingDaysPerMonth * workingHoursPerDay;
      const hourlyRate = employee.base_salary / workingHoursPerMonth;
      
      // حساب مبلغ الساعات الإضافية
      const totalOvertimeHours = salaryData.overtime_hours + attendanceSummary.overtime_hours;
      const overtimeAmount = totalOvertimeHours * hourlyRate * overtimeMultiplier;
      
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
        overtime_hours: totalOvertimeHours,
        overtime_rate: hourlyRate * overtimeMultiplier,
        overtime_amount: overtimeAmount,
        bonus: salaryData.bonus,
        deductions: salaryData.deductions,
        gross_salary: grossSalary,
        tax_amount: taxAmount,
        insurance_deduction: insuranceDeduction,
        net_salary: netSalary,
        attendance_days: attendanceSummary.present_days || workingDaysPerMonth,
        absence_days: attendanceSummary.absent_days || 0,
        late_hours: attendanceSummary.late_hours || 0,
        currency: 'EGP', // جميع الرواتب بالجنيه المصري
        status: 'pending',
        notes: salaryData.notes
      };

      setCalculatedSalary(calculatedData);
      toast.success('تم حساب الراتب بنجاح');
    } catch (error) {
      console.error('Error calculating salary:', error);
      toast.error('حدث خطأ في حساب الراتب');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleSaveSalary = async () => {
    if (!calculatedSalary) {
      toast.error('يرجى حساب الراتب أولاً');
      return;
    }

    try {
      await calculateMonthlySalary({
        ...calculatedSalary,
        currency: 'EGP' // التأكد من أن العملة هي الجنيه المصري
      });
      
      toast.success('تم حفظ الراتب بنجاح');
      setCalculatedSalary(null);
      setSalaryData({ overtime_hours: 0, bonus: 0, deductions: 0, notes: '' });
      setSelectedEmployee('');
    } catch (error) {
      console.error('Error saving salary:', error);
      toast.error('حدث خطأ في حفظ الراتب');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
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
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              جميع الرواتب محسوبة بالجنيه المصري. تأكد من صحة البيانات قبل الحفظ.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="employee">الموظف</Label>
            <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
              <SelectTrigger>
                <SelectValue placeholder="اختر موظف" />
              </SelectTrigger>
              <SelectContent>
                {employees?.filter(emp => emp.is_active).map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name} - {employee.employee_code} 
                    ({formatCurrency(employee.base_salary)} راتب أساسي)
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
              min="0"
              value={salaryData.overtime_hours}
              onChange={(e) => setSalaryData(prev => ({ 
                ...prev, 
                overtime_hours: Math.max(0, parseFloat(e.target.value) || 0)
              }))}
            />
            <p className="text-xs text-gray-500">
              (سيتم إضافتها لساعات الحضور الإضافية من نظام الحضور)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bonus">المكافآت (جنيه مصري)</Label>
            <Input
              id="bonus"
              type="number"
              step="0.01"
              min="0"
              value={salaryData.bonus}
              onChange={(e) => setSalaryData(prev => ({ 
                ...prev, 
                bonus: Math.max(0, parseFloat(e.target.value) || 0)
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deductions">الاستقطاعات الإضافية (جنيه مصري)</Label>
            <Input
              id="deductions"
              type="number"
              step="0.01"
              min="0"
              value={salaryData.deductions}
              onChange={(e) => setSalaryData(prev => ({ 
                ...prev, 
                deductions: Math.max(0, parseFloat(e.target.value) || 0)
              }))}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">ملاحظات</Label>
            <Input
              id="notes"
              value={salaryData.notes}
              onChange={(e) => setSalaryData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="ملاحظات إضافية..."
            />
          </div>

          <Button 
            onClick={handleCalculateSalary}
            className="w-full"
            disabled={!selectedEmployee || isCalculating}
          >
            <Calculator className="h-4 w-4 mr-2" />
            {isCalculating ? 'جاري الحساب...' : 'حساب الراتب'}
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
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                الراتب محسوب بالجنيه المصري. راجع البيانات قبل الحفظ.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-gray-600">الراتب الأساسي</Label>
                <p className="font-semibold text-lg">
                  {formatCurrency(calculatedSalary.base_salary)}
                </p>
              </div>
              <div>
                <Label className="text-gray-600">البدلات</Label>
                <p className="font-semibold text-lg">
                  {formatCurrency(calculatedSalary.allowances)}
                </p>
              </div>
              <div>
                <Label className="text-gray-600">الساعات الإضافية</Label>
                <p className="font-semibold text-lg text-blue-600">
                  {formatCurrency(calculatedSalary.overtime_amount)}
                </p>
                <p className="text-xs text-gray-500">
                  {calculatedSalary.overtime_hours} ساعة
                </p>
              </div>
              <div>
                <Label className="text-gray-600">المكافآت</Label>
                <p className="font-semibold text-lg text-green-600">
                  {formatCurrency(calculatedSalary.bonus)}
                </p>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-gray-600">الراتب الإجمالي</Label>
                <p className="font-semibold text-lg text-blue-600">
                  {formatCurrency(calculatedSalary.gross_salary)}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">الضرائب</span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(calculatedSalary.tax_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">التأمين</span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(calculatedSalary.insurance_deduction)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">استقطاعات أخرى</span>
                <span className="font-semibold text-red-600">
                  -{formatCurrency(calculatedSalary.deductions)}
                </span>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <Label className="text-lg font-semibold">الراتب الصافي</Label>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(calculatedSalary.net_salary)}
                </p>
              </div>
            </div>

            {calculatedSalary.notes && (
              <div className="border-t pt-4">
                <Label className="text-gray-600">ملاحظات</Label>
                <p className="text-sm bg-gray-50 p-2 rounded">
                  {calculatedSalary.notes}
                </p>
              </div>
            )}

            <Button 
              onClick={handleSaveSalary}
              className="w-full"
              disabled={isCalculatingSalary}
            >
              <Save className="h-4 w-4 mr-2" />
              {isCalculatingSalary ? 'جاري الحفظ...' : 'حفظ الراتب'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SalaryCalculation;
