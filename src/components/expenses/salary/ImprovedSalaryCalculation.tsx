
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calculator, Save, Eye, AlertCircle, Loader2 } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { useSalariesImproved } from '@/hooks/useSalariesImproved';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

interface SalaryFormData {
  employee_id: string;
  salary_month: string;
  overtime_hours: number;
  bonus: number;
  deductions: number;
  notes: string;
}

const ImprovedSalaryCalculation = () => {
  const { employees, employeesLoading } = useEmployees();
  const { 
    calculateMonthlySalary, 
    isCalculatingSalary,
    checkSalaryExists,
    monthlySalaries
  } = useSalariesImproved();
  
  const [formData, setFormData] = useState<SalaryFormData>({
    employee_id: '',
    salary_month: new Date().toISOString().slice(0, 7),
    overtime_hours: 0,
    bonus: 0,
    deductions: 0,
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // التحقق من صحة البيانات
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.employee_id) {
      errors.push('يجب اختيار موظف');
    }

    if (!formData.salary_month) {
      errors.push('يجب تحديد شهر الراتب');
    }

    if (formData.overtime_hours < 0) {
      errors.push('عدد الساعات الإضافية لا يمكن أن يكون سالباً');
    }

    if (formData.bonus < 0) {
      errors.push('المكافآت لا يمكن أن تكون سالبة');
    }

    if (formData.deductions < 0) {
      errors.push('الاستقطاعات لا يمكن أن تكون سالبة');
    }

    // التحقق من وجود راتب مسبق
    if (formData.employee_id && formData.salary_month) {
      if (checkSalaryExists(formData.employee_id, formData.salary_month)) {
        errors.push('تم حساب راتب هذا الموظف لهذا الشهر مسبقاً');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleInputChange = (field: keyof SalaryFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // مسح أخطاء التحقق عند تغيير البيانات
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }
  };

  const handleCalculateSalary = async () => {
    if (!validateForm()) {
      toast.error('يرجى تصحيح الأخطاء المذكورة أعلاه');
      return;
    }

    try {
      await calculateMonthlySalary(formData);
      
      // إعادة تعيين النموذج عند النجاح
      setFormData({
        employee_id: '',
        salary_month: new Date().toISOString().slice(0, 7),
        overtime_hours: 0,
        bonus: 0,
        deductions: 0,
        notes: ''
      });
      
    } catch (error) {
      console.error('خطأ في حساب الراتب:', error);
      // الخطأ سيتم عرضه تلقائياً من خلال hook
    }
  };

  const selectedEmployee = employees?.find(emp => emp.id === formData.employee_id);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (employeesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>جاري تحميل بيانات الموظفين...</span>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          حساب راتب الموظف (محسّن)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            نظام حساب الرواتب المحسّن يستخدم stored procedures لضمان دقة الحسابات والأمان.
            جميع الرواتب محسوبة بالجنيه المصري.
          </AlertDescription>
        </Alert>

        {/* عرض أخطاء التحقق */}
        {validationErrors.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* البيانات الأساسية */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employee">الموظف *</Label>
              <Select 
                value={formData.employee_id} 
                onValueChange={(value) => handleInputChange('employee_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.filter(emp => emp.is_active).map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name} - {employee.employee_code}
                      <span className="text-xs text-gray-500 block">
                        ({formatCurrency(employee.base_salary)} راتب أساسي)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">شهر الراتب *</Label>
              <Input
                id="month"
                type="month"
                value={formData.salary_month}
                onChange={(e) => handleInputChange('salary_month', e.target.value)}
              />
            </div>

            {/* عرض بيانات الموظف المحدد */}
            {selectedEmployee && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <h4 className="font-medium">بيانات الموظف:</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">الاسم:</span> {selectedEmployee.full_name}</p>
                  <p><span className="font-medium">المنصب:</span> {selectedEmployee.position}</p>
                  <p><span className="font-medium">القسم:</span> {selectedEmployee.department || 'غير محدد'}</p>
                  <p><span className="font-medium">الراتب الأساسي:</span> <EgyptianPoundDisplay amount={selectedEmployee.base_salary} /></p>
                  <p><span className="font-medium">البدلات:</span> <EgyptianPoundDisplay amount={selectedEmployee.allowances} /></p>
                </div>
              </div>
            )}
          </div>

          {/* البيانات الإضافية */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="overtime">الساعات الإضافية</Label>
              <Input
                id="overtime"
                type="number"
                step="0.5"
                min="0"
                value={formData.overtime_hours}
                onChange={(e) => handleInputChange('overtime_hours', Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bonus">المكافآت (جنيه مصري)</Label>
              <Input
                id="bonus"
                type="number"
                step="0.01"
                min="0"
                value={formData.bonus}
                onChange={(e) => handleInputChange('bonus', Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deductions">الاستقطاعات الإضافية (جنيه مصري)</Label>
              <Input
                id="deductions"
                type="number"
                step="0.01"
                min="0"
                value={formData.deductions}
                onChange={(e) => handleInputChange('deductions', Math.max(0, parseFloat(e.target.value) || 0))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="ملاحظات إضافية..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <Button 
          onClick={handleCalculateSalary}
          className="w-full"
          disabled={!formData.employee_id || isCalculatingSalary || validationErrors.length > 0}
        >
          {isCalculatingSalary ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              جاري حساب وحفظ الراتب...
            </>
          ) : (
            <>
              <Calculator className="h-4 w-4 mr-2" />
              حساب وحفظ الراتب
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ImprovedSalaryCalculation;
