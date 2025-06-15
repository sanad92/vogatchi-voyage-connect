import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, User, Phone, Mail, Calendar, DollarSign, Link, Users } from 'lucide-react';
import { useExpenses } from '@/hooks/useExpenses';
import { useUserEmployeeMapping } from '@/hooks/useUserEmployeeMapping';
import type { Employee } from '@/types/expenses';

const EmployeeManagement = () => {
  const { employees, addEmployee, isAddingEmployee } = useExpenses();
  const { currentEmployee, linkUserToEmployee } = useUserEmployeeMapping();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newEmployee, setNewEmployee] = useState<Omit<Employee, 'id' | 'created_at' | 'updated_at'>>({
    employee_code: '',
    full_name: '',
    position: '',
    department: '',
    phone: '',
    email: '',
    national_id: '',
    hire_date: new Date().toISOString().split('T')[0],
    salary_scale_level: 1,
    base_salary: 0,
    allowances: 0,
    is_active: true,
    bank_account_number: '',
    bank_name: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });

  const filteredEmployees = employees?.filter(employee =>
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.full_name || !newEmployee.employee_code || !newEmployee.position) {
      return;
    }

    addEmployee(newEmployee);
    setIsAddDialogOpen(false);
    setNewEmployee({
      employee_code: '',
      full_name: '',
      position: '',
      department: '',
      phone: '',
      email: '',
      national_id: '',
      hire_date: new Date().toISOString().split('T')[0],
      salary_scale_level: 1,
      base_salary: 0,
      allowances: 0,
      is_active: true,
      bank_account_number: '',
      bank_name: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    });
  };

  const handleLinkEmployee = async (employeeId: string) => {
    await linkUserToEmployee(employeeId);
  };

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">إدارة الموظفين</h2>
          <p className="text-gray-600">إدارة بيانات الموظفين ومعلوماتهم الأساسية</p>
          {currentEmployee && (
            <div className="mt-2 p-2 bg-green-50 rounded-lg">
              <span className="text-green-800 text-sm">
                مرتبط بالموظف: {currentEmployee.full_name} ({currentEmployee.employee_code})
              </span>
            </div>
          )}
          
          {/* إشعار حول النظام الموحد */}
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-blue-800 text-sm">
                <strong>ملاحظة:</strong> تم دمج إدارة الموظفين مع نظام المستخدمين. 
                للحصول على تجربة كاملة وإدارة موحدة، يرجى استخدام{' '}
                <button 
                  onClick={() => window.location.href = '/admin-settings'}
                  className="underline font-medium hover:text-blue-900"
                >
                  نظام الإدارة الموحد
                </button>
                {' '}في إعدادات الأدمن.
              </div>
            </div>
          </div>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              إضافة موظف جديد
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>إضافة موظف جديد</DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="+966XXXXXXXXX"
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
                  <Label htmlFor="base_salary">الراتب الأساسي (ر.س)</Label>
                  <Input
                    id="base_salary"
                    type="number"
                    value={newEmployee.base_salary}
                    onChange={(e) => setNewEmployee({ ...newEmployee, base_salary: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="allowances">البدلات (ر.س)</Label>
                  <Input
                    id="allowances"
                    type="number"
                    value={newEmployee.allowances}
                    onChange={(e) => setNewEmployee({ ...newEmployee, allowances: Number(e.target.value) })}
                    placeholder="0"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bank_name">اسم البنك</Label>
                  <Input
                    id="bank_name"
                    value={newEmployee.bank_name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, bank_name: e.target.value })}
                    placeholder="البنك الأهلي السعودي"
                  />
                </div>
                
                <div>
                  <Label htmlFor="bank_account_number">رقم الحساب البنكي</Label>
                  <Input
                    id="bank_account_number"
                    value={newEmployee.bank_account_number}
                    onChange={(e) => setNewEmployee({ ...newEmployee, bank_account_number: e.target.value })}
                    placeholder="SA..."
                  />
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={isAddingEmployee}>
                  {isAddingEmployee ? 'جاري الحفظ...' : 'حفظ الموظف'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                >
                  إلغاء
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* شريط البحث */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="البحث في الموظفين..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* قائمة الموظفين */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <Card key={employee.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  {employee.full_name}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant={employee.is_active ? "default" : "secondary"}>
                    {employee.is_active ? 'نشط' : 'غير نشط'}
                  </Badge>
                  {!currentEmployee && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLinkEmployee(employee.id)}
                    >
                      <Link className="h-3 w-3 mr-1" />
                      ربط
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="font-medium">رقم الموظف:</span> {employee.employee_code}
                </p>
                <p className="text-sm">
                  <span className="font-medium">المنصب:</span> {employee.position}
                </p>
                {employee.department && (
                  <p className="text-sm">
                    <span className="font-medium">القسم:</span> {employee.department}
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {employee.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    <span>{employee.phone}</span>
                  </div>
                )}
                {employee.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                )}
              </div>
              
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-gray-400" />
                    <span>تاريخ التوظيف: {new Date(employee.hire_date).toLocaleDateString('ar')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <DollarSign className="h-3 w-3 text-green-600" />
                  <span className="text-sm font-medium">
                    {(employee.base_salary + employee.allowances).toLocaleString()} ج.م
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">لا توجد موظفين</h3>
            <p className="text-gray-600 mb-4">
              لم يتم العثور على موظفين مطابقين لمعايير البحث
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeManagement;
