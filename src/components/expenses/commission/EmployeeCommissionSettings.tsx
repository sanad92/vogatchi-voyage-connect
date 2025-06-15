
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Settings, Edit, DollarSign } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useEmployeeCommissions } from '@/hooks/useEmployeeCommissions';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';

const EmployeeCommissionSettings = () => {
  const { employees, employeesLoading } = useExpenses();
  const { updateEmployeeCommissionSettings, isUpdatingSettings } = useEmployeeCommissions();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [commissionSettings, setCommissionSettings] = useState({
    commission_rate: 0,
    commission_type: 'percentage'
  });
  const [errors, setErrors] = useState<{ commission_rate?: string }>({});

  const handleEditEmployee = (employee: any) => {
    console.log('Editing employee commission settings:', employee);
    setSelectedEmployee(employee);
    setCommissionSettings({
      commission_rate: employee.commission_rate || 0,
      commission_type: employee.commission_type || 'percentage'
    });
    setErrors({});
    setIsEditDialogOpen(true);
  };

  const validateCommissionRate = (rate: number) => {
    if (rate < 0 || rate > 100) {
      return 'معدل العمولة يجب أن يكون بين 0 و 100%';
    }
    if (isNaN(rate)) {
      return 'معدل العمولة يجب أن يكون رقم صحيح';
    }
    return null;
  };

  const handleSaveCommissionSettings = async () => {
    if (!selectedEmployee) {
      console.error('No employee selected');
      return;
    }

    // التحقق من صحة البيانات
    const rateError = validateCommissionRate(commissionSettings.commission_rate);
    if (rateError) {
      setErrors({ commission_rate: rateError });
      return;
    }

    console.log('Saving commission settings:', {
      employeeId: selectedEmployee.id,
      settings: commissionSettings
    });

    try {
      await updateEmployeeCommissionSettings(selectedEmployee.id, commissionSettings);
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      setErrors({});
    } catch (error) {
      console.error('Error saving commission settings:', error);
    }
  };

  if (employeesLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg">جاري التحميل...</div>
      </div>
    );
  }

  if (!employees || employees.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>لا توجد موظفين في النظام</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          إعدادات عمولات الموظفين
        </h2>
      </div>

      {/* جدول الموظفين وإعداداتهم */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            إعدادات العمولات للموظفين
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الموظف</TableHead>
                <TableHead>الكود</TableHead>
                <TableHead>المنصب</TableHead>
                <TableHead>معدل العمولة</TableHead>
                <TableHead>نوع العمولة</TableHead>
                <TableHead>إجمالي العمولات المكتسبة</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>العمليات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="font-medium">
                    {employee.full_name}
                  </TableCell>
                  <TableCell>{employee.employee_code}</TableCell>
                  <TableCell>{employee.position}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-600">
                        {employee.commission_rate || 0}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {employee.commission_type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <MultiCurrencyDisplay 
                        amount={employee.total_commission_earned || 0} 
                        currency="EGP" 
                        showInEGP={false} 
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={employee.is_active ? "default" : "secondary"}>
                      {employee.is_active ? 'نشط' : 'غير نشط'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEditEmployee(employee)}
                      disabled={!employee.is_active}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      تعديل
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* مربع حوار تعديل إعدادات العمولة */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              تعديل إعدادات العمولة - {selectedEmployee?.full_name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>معدل العمولة (%)</Label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={commissionSettings.commission_rate}
                onChange={(e) => {
                  const value = parseFloat(e.target.value) || 0;
                  setCommissionSettings(prev => ({ 
                    ...prev, 
                    commission_rate: value
                  }));
                  setErrors({});
                }}
                className={errors.commission_rate ? 'border-red-500' : ''}
              />
              {errors.commission_rate && (
                <p className="text-red-500 text-sm">{errors.commission_rate}</p>
              )}
              <p className="text-sm text-gray-600">
                أدخل معدل العمولة كنسبة مئوية (مثل: 2.5 للحصول على 2.5%)
              </p>
            </div>

            <div className="space-y-2">
              <Label>نوع العمولة</Label>
              <Select 
                value={commissionSettings.commission_type} 
                onValueChange={(value) => setCommissionSettings(prev => ({ ...prev, commission_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">نسبة مئوية</SelectItem>
                  <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* معلومات إضافية */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">معلومات الموظف:</h4>
              <div className="space-y-1 text-sm text-blue-800">
                <p><span className="font-medium">الكود:</span> {selectedEmployee?.employee_code}</p>
                <p><span className="font-medium">المنصب:</span> {selectedEmployee?.position}</p>
                <p><span className="font-medium">القسم:</span> {selectedEmployee?.department || 'غير محدد'}</p>
                <p><span className="font-medium">إجمالي العمولات المكتسبة:</span> 
                  <MultiCurrencyDisplay 
                    amount={selectedEmployee?.total_commission_earned || 0} 
                    currency="EGP" 
                    showInEGP={false} 
                  />
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                onClick={handleSaveCommissionSettings}
                disabled={isUpdatingSettings}
              >
                {isUpdatingSettings ? 'جاري الحفظ...' : 'حفظ التغييرات'}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isUpdatingSettings}
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmployeeCommissionSettings;
