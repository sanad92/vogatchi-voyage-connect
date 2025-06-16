
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { Employee } from '@/types/expenses';

interface EmployeeFormDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newEmployee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>;
  setNewEmployee: (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => void;
  onSubmit: (e: React.FormEvent) => void;
  isAddingEmployee: boolean;
}

const EmployeeFormDialog = ({
  isOpen,
  onOpenChange,
  newEmployee,
  setNewEmployee,
  onSubmit,
  isAddingEmployee,
}: EmployeeFormDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">إضافة موظف جديد</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-6">
          {/* المعلومات الأساسية */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">المعلومات الأساسية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="employee_code">رقم الموظف <span className="text-red-500">*</span></Label>
                <Input
                  id="employee_code"
                  value={newEmployee.employee_code}
                  onChange={(e) => setNewEmployee({ ...newEmployee, employee_code: e.target.value })}
                  placeholder="EMP-001"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="full_name">الاسم الكامل <span className="text-red-500">*</span></Label>
                <Input
                  id="full_name"
                  value={newEmployee.full_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                  placeholder="أدخل الاسم الكامل"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="position">المنصب <span className="text-red-500">*</span></Label>
                <Input
                  id="position"
                  value={newEmployee.position}
                  onChange={(e) => setNewEmployee({ ...newEmployee, position: e.target.value })}
                  placeholder="مطور برمجيات"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="department">القسم</Label>
                <Input
                  id="department"
                  value={newEmployee.department}
                  onChange={(e) => setNewEmployee({ ...newEmployee, department: e.target.value })}
                  placeholder="تقنية المعلومات"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* معلومات الاتصال */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">معلومات الاتصال</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  placeholder="+20XXXXXXXXX"
                />
              </div>
              
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  placeholder="employee@company.com"
                />
              </div>
              
              <div>
                <Label htmlFor="national_id">الرقم القومي</Label>
                <Input
                  id="national_id"
                  value={newEmployee.national_id}
                  onChange={(e) => setNewEmployee({ ...newEmployee, national_id: e.target.value })}
                  placeholder="14 رقم"
                />
              </div>
              
              <div>
                <Label htmlFor="hire_date">تاريخ التوظيف</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={newEmployee.hire_date}
                  onChange={(e) => setNewEmployee({ ...newEmployee, hire_date: e.target.value })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* المعلومات المالية */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">المعلومات المالية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="base_salary">الراتب الأساسي (جنيه مصري)</Label>
                <Input
                  id="base_salary"
                  type="number"
                  value={newEmployee.base_salary}
                  onChange={(e) => setNewEmployee({ ...newEmployee, base_salary: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                />
              </div>
              
              <div>
                <Label htmlFor="allowances">البدلات (جنيه مصري)</Label>
                <Input
                  id="allowances"
                  type="number"
                  value={newEmployee.allowances}
                  onChange={(e) => setNewEmployee({ ...newEmployee, allowances: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                />
              </div>
              
              <div>
                <Label htmlFor="commission_rate">معدل العمولة (%)</Label>
                <Input
                  id="commission_rate"
                  type="number"
                  value={newEmployee.commission_rate || 0}
                  onChange={(e) => setNewEmployee({ ...newEmployee, commission_rate: Number(e.target.value) })}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>
              
              <div>
                <Label htmlFor="salary_scale_level">مستوى السلم الوظيفي</Label>
                <Input
                  id="salary_scale_level"
                  type="number"
                  value={newEmployee.salary_scale_level}
                  onChange={(e) => setNewEmployee({ ...newEmployee, salary_scale_level: Number(e.target.value) })}
                  placeholder="1"
                  min="1"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* المعلومات البنكية */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">المعلومات البنكية</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bank_name">اسم البنك</Label>
                <Input
                  id="bank_name"
                  value={newEmployee.bank_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, bank_name: e.target.value })}
                  placeholder="البنك الأهلي المصري"
                />
              </div>
              
              <div>
                <Label htmlFor="bank_account_number">رقم الحساب البنكي</Label>
                <Input
                  id="bank_account_number"
                  value={newEmployee.bank_account_number}
                  onChange={(e) => setNewEmployee({ ...newEmployee, bank_account_number: e.target.value })}
                  placeholder="رقم الحساب..."
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* جهات الاتصال الطارئة */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">جهة الاتصال في حالات الطوارئ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">اسم جهة الاتصال</Label>
                <Input
                  id="emergency_contact_name"
                  value={newEmployee.emergency_contact_name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, emergency_contact_name: e.target.value })}
                  placeholder="اسم الشخص للاتصال به في حالات الطوارئ"
                />
              </div>
              
              <div>
                <Label htmlFor="emergency_contact_phone">رقم هاتف جهة الاتصال</Label>
                <Input
                  id="emergency_contact_phone"
                  value={newEmployee.emergency_contact_phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, emergency_contact_phone: e.target.value })}
                  placeholder="+20XXXXXXXXX"
                />
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isAddingEmployee}
              className="flex-1 sm:flex-none"
            >
              {isAddingEmployee ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  جاري الحفظ...
                </>
              ) : (
                'حفظ الموظف'
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={isAddingEmployee}
            >
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
