
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calculator, Save, Eye, AlertCircle, Loader2, Users, Calendar } from 'lucide-react';
import { useEmployees } from '@/hooks/useEmployees';
import { usePeriodCommissions } from '@/hooks/usePeriodCommissions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

interface PeriodCommissionFormData {
  employee_id: string;
  period_start: string;
  period_end: string;
  notes: string;
}

const PeriodCommissionCalculation = () => {
  const { employees, employeesLoading } = useEmployees();
  const { 
    generatePeriodCommission, 
    isGenerating,
    getEmployeeBookingsProfit
  } = usePeriodCommissions();
  
  const [formData, setFormData] = useState<PeriodCommissionFormData>({
    employee_id: '',
    period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    period_end: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // جلب تفاصيل الحجوزات للمعاينة
  const { data: bookingsProfit, isLoading: bookingsLoading } = getEmployeeBookingsProfit(
    formData.employee_id,
    formData.period_start,
    formData.period_end
  );

  // التحقق من صحة البيانات
  const validateForm = (): boolean => {
    const errors: string[] = [];

    if (!formData.employee_id) {
      errors.push('يجب اختيار موظف');
    }

    if (!formData.period_start) {
      errors.push('يجب تحديد تاريخ بداية الفترة');
    }

    if (!formData.period_end) {
      errors.push('يجب تحديد تاريخ نهاية الفترة');
    }

    if (formData.period_start && formData.period_end) {
      if (new Date(formData.period_start) >= new Date(formData.period_end)) {
        errors.push('تاريخ نهاية الفترة يجب أن يكون بعد تاريخ البداية');
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleInputChange = (field: keyof PeriodCommissionFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // مسح أخطاء التحقق عند تغيير البيانات
    if (validationErrors.length > 0) {
      setValidationErrors([]);
    }

    // إخفاء المعاينة عند تغيير البيانات الأساسية
    if (field !== 'notes' && showPreview) {
      setShowPreview(false);
    }
  };

  const handlePreview = () => {
    if (!validateForm()) {
      return;
    }
    setShowPreview(true);
  };

  const handleGenerateCommission = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await generatePeriodCommission({
        employeeId: formData.employee_id,
        periodStart: formData.period_start,
        periodEnd: formData.period_end,
        notes: formData.notes || undefined
      });
      
      // إعادة تعيين النموذج عند النجاح
      setFormData({
        employee_id: '',
        period_start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        notes: ''
      });
      setShowPreview(false);
      
    } catch (error) {
      console.error('خطأ في حساب العمولة المجمعة:', error);
    }
  };

  const selectedEmployee = employees?.find(emp => emp.id === formData.employee_id);
  const activeEmployees = employees?.filter(emp => emp.is_active && emp.commission_rate > 0) || [];

  // حساب الإحصائيات من بيانات الحجوزات
  const calculateSummary = () => {
    if (!bookingsProfit || !selectedEmployee) return null;

    const totalBookings = bookingsProfit.length;
    const totalBookingAmount = bookingsProfit.reduce((sum, booking) => sum + booking.booking_amount, 0);
    const totalSupplierCost = bookingsProfit.reduce((sum, booking) => sum + booking.supplier_cost, 0);
    const totalProfit = bookingsProfit.reduce((sum, booking) => sum + booking.profit, 0);
    const commissionAmount = totalProfit * (selectedEmployee.commission_rate / 100);

    return {
      totalBookings,
      totalBookingAmount,
      totalSupplierCost,
      totalProfit,
      commissionAmount,
      commissionRate: selectedEmployee.commission_rate
    };
  };

  const summary = calculateSummary();

  if (employeesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>جاري تحميل بيانات الموظفين...</span>
      </div>
    );
  }

  if (activeEmployees.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            حساب العمولة المجمعة للفترة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              لا توجد موظفين نشطين بمعدل عمولة محدد. يرجى تعديل إعدادات العمولة للموظفين أولاً.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          حساب العمولة المجمعة للفترة
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            النظام الجديد يحسب العمولة 10% من إجمالي الربح (سعر البيع - سعر الشراء) لكل الحجوزات في الفترة المحددة.
            ({activeEmployees.length} موظف نشط متاح)
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
              <Label htmlFor="employee">الموظف * ({activeEmployees.length} متاح)</Label>
              <Select 
                value={formData.employee_id} 
                onValueChange={(value) => handleInputChange('employee_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف" />
                </SelectTrigger>
                <SelectContent>
                  {activeEmployees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name} - {employee.employee_code}
                      <span className="text-xs text-gray-500 block">
                        (معدل العمولة: {employee.commission_rate}%)
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period_start">بداية الفترة *</Label>
                <Input
                  id="period_start"
                  type="date"
                  value={formData.period_start}
                  onChange={(e) => handleInputChange('period_start', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="period_end">نهاية الفترة *</Label>
                <Input
                  id="period_end"
                  type="date"
                  value={formData.period_end}
                  onChange={(e) => handleInputChange('period_end', e.target.value)}
                />
              </div>
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

          {/* معاينة البيانات */}
          <div className="space-y-4">
            {selectedEmployee && (
              <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                <h4 className="font-medium">بيانات الموظف:</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">الاسم:</span> {selectedEmployee.full_name}</p>
                  <p><span className="font-medium">المنصب:</span> {selectedEmployee.position}</p>
                  <p><span className="font-medium">القسم:</span> {selectedEmployee.department || 'غير محدد'}</p>
                  <p><span className="font-medium">معدل العمولة:</span> {selectedEmployee.commission_rate}%</p>
                </div>
              </div>
            )}

            {showPreview && summary && (
              <div className="p-4 bg-blue-50 rounded-lg space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  معاينة حساب العمولة:
                </h4>
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>عدد الحجوزات:</span>
                    <span className="font-medium">{summary.totalBookings}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>إجمالي المبيعات:</span>
                    <span className="font-medium">
                      <EgyptianPoundDisplay amount={summary.totalBookingAmount} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>إجمالي التكلفة:</span>
                    <span className="font-medium">
                      <EgyptianPoundDisplay amount={summary.totalSupplierCost} />
                    </span>
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>إجمالي الربح:</span>
                    <span className="font-bold">
                      <EgyptianPoundDisplay amount={summary.totalProfit} />
                    </span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex justify-between text-blue-600">
                    <span>العمولة ({summary.commissionRate}%):</span>
                    <span className="font-bold text-lg">
                      <EgyptianPoundDisplay amount={summary.commissionAmount} />
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            onClick={handlePreview}
            variant="outline"
            disabled={!formData.employee_id || !formData.period_start || !formData.period_end || bookingsLoading}
          >
            {bookingsLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                جاري التحميل...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                معاينة العمولة
              </>
            )}
          </Button>

          <Button 
            onClick={handleGenerateCommission}
            disabled={!showPreview || !summary || isGenerating || validationErrors.length > 0}
            className="flex-1"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                جاري حساب وحفظ العمولة...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                حساب وحفظ العمولة المجمعة
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PeriodCommissionCalculation;
