
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Edit, Save, X } from 'lucide-react';

interface EditEmployeeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employee: {
    id: string;
    employee_code: string;
    full_name: string;
    position: string;
    department: string;
    phone?: string;
    email?: string;
    national_id?: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
    commission_rate?: number;
    is_active: boolean;
    bank_account_number?: string;
    bank_name?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  };
  onSave: (employeeData: any) => Promise<void>;
  isLoading: boolean;
}

const EditEmployeeDialog = ({ isOpen, onOpenChange, employee, onSave, isLoading }: EditEmployeeDialogProps) => {
  const [formData, setFormData] = useState({
    full_name: '',
    position: '',
    department: '',
    phone: '',
    email: '',
    national_id: '',
    hire_date: '',
    base_salary: 0,
    allowances: 0,
    commission_rate: 0,
    is_active: true,
    bank_account_number: '',
    bank_name: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  useEffect(() => {
    if (employee && isOpen) {
      setFormData({
        full_name: employee.full_name || '',
        position: employee.position || '',
        department: employee.department || '',
        phone: employee.phone || '',
        email: employee.email || '',
        national_id: employee.national_id || '',
        hire_date: employee.hire_date || '',
        base_salary: employee.base_salary || 0,
        allowances: employee.allowances || 0,
        commission_rate: employee.commission_rate || 0,
        is_active: employee.is_active ?? true,
        bank_account_number: employee.bank_account_number || '',
        bank_name: employee.bank_name || '',
        emergency_contact_name: employee.emergency_contact_name || '',
        emergency_contact_phone: employee.emergency_contact_phone || '',
      });
    }
  }, [employee, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await onSave({
        id: employee.id,
        ...formData
      });
      onOpenChange(false);
    } catch (error) {
      console.error('خطأ في حفظ بيانات الموظف:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            تعديل بيانات الموظف: {employee?.full_name}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* المعلومات الأساسية */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">المعلومات الأساسية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">الاسم الكامل *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleInputChange('full_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="position">المنصب *</Label>
                  <Input
                    id="position"
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="department">القسم</Label>
                  <Input
                    id="department"
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="hire_date">تاريخ التوظيف</Label>
                  <Input
                    id="hire_date"
                    type="date"
                    value={formData.hire_date}
                    onChange={(e) => handleInputChange('hire_date', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="national_id">الرقم القومي</Label>
                  <Input
                    id="national_id"
                    value={formData.national_id}
                    onChange={(e) => handleInputChange('national_id', e.target.value)}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                  />
                  <Label htmlFor="is_active">موظف نشط</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* معلومات الاتصال */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">معلومات الاتصال</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_name">اسم جهة الاتصال في الطوارئ</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">هاتف جهة الاتصال في الطوارئ</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* المعلومات المالية */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">المعلومات المالية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="base_salary">الراتب الأساسي</Label>
                  <Input
                    id="base_salary"
                    type="number"
                    step="0.01"
                    value={formData.base_salary}
                    onChange={(e) => handleInputChange('base_salary', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="allowances">البدلات</Label>
                  <Input
                    id="allowances"
                    type="number"
                    step="0.01"
                    value={formData.allowances}
                    onChange={(e) => handleInputChange('allowances', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="commission_rate">معدل العمولة (%)</Label>
                  <Input
                    id="commission_rate"
                    type="number"
                    step="0.01"
                    value={formData.commission_rate}
                    onChange={(e) => handleInputChange('commission_rate', parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* المعلومات البنكية */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">المعلومات البنكية</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bank_name">اسم البنك</Label>
                  <Input
                    id="bank_name"
                    value={formData.bank_name}
                    onChange={(e) => handleInputChange('bank_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="bank_account_number">رقم الحساب البنكي</Label>
                  <Input
                    id="bank_account_number"
                    value={formData.bank_account_number}
                    onChange={(e) => handleInputChange('bank_account_number', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4 mr-2" />
              إلغاء
            </Button>
            <Button type="submit" disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditEmployeeDialog;
