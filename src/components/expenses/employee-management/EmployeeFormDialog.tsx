
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة موظف جديد</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="employee_code">رقم الموظف *</Label>
              <Input
                id="employee_code"
                value={newEmployee.employee_code}
                onChange={(e) => setNewEmployee({ ...newEmployee, employee_code: e.target.value })}
                placeholder="EMP-001"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="full_name">الاسم الكامل *</Label>
              <Input
                id="full_name"
                value={newEmployee.full_name}
                onChange={(e) => setNewEmployee({ ...newEmployee, full_name: e.target.value })}
                placeholder="أدخل الاسم الكامل"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="position">المنصب *</Label>
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
              <Label htmlFor="hire_date">تاريخ التوظيف</Label>
              <Input
                id="hire_date"
                type="date"
                value={newEmployee.hire_date}
                onChange={(e) => setNewEmployee({ ...newEmployee, hire_date: e.target.value })}
              />
            </div>
            
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
            
            <div>
              <Label htmlFor="national_id">الرقم القومي</Label>
              <Input
                id="national_id"
                value={newEmployee.national_id}
                onChange={(e) => setNewEmployee({ ...newEmployee, national_id: e.target.value })}
                placeholder="14 رقم"
              />
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isAddingEmployee}>
              {isAddingEmployee ? 'جاري الحفظ...' : 'حفظ الموظف'}
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeFormDialog;
