
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, User, Phone, Mail, Calendar, DollarSign, Link, Users, RefreshCw } from 'lucide-react';
import { useUnifiedData } from '@/hooks/useUnifiedData';
import { useEmployees } from '@/hooks/useEmployees';
import { useUserEmployeeMapping } from '@/hooks/useUserEmployeeMapping';
import { toast } from 'sonner';
import type { Employee } from '@/types/expenses';

interface EnhancedEmployee {
  id: string;
  employee_code: string;
  full_name: string;
  position: string;
  department: string;
  phone?: string;
  email?: string;
  national_id?: string;
  hire_date: string;
  salary_scale_level?: number;
  base_salary: number;
  allowances: number;
  commission_rate?: number;
  is_active: boolean;
  bank_account_number?: string;
  bank_name?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  created_at: string;
  updated_at: string;
  linkedToUser: boolean;
  userId?: string;
}

const EmployeeManagement = () => {
  const { addEmployee, isAddingEmployee } = useEmployees();
  const { currentEmployee, linkUserToEmployee } = useUserEmployeeMapping();
  const { 
    unifiedUsers, 
    unlinkedEmployees, 
    isLoading: unifiedLoading, 
    refreshAllData 
  } = useUnifiedData();
  
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

  // دمج الموظفين من البيانات الموحدة والموظفين غير المرتبطين
  const allEmployees: EnhancedEmployee[] = [
    // الموظفين المرتبطين بمستخدمين
    ...(unifiedUsers?.filter(user => user.employee).map(user => ({
      id: user.employee!.id,
      employee_code: user.employee!.employee_code,
      full_name: user.full_name,
      position: user.employee!.position,
      department: user.department || '',
      phone: user.phone,
      email: user.email,
      national_id: user.employee!.national_id,
      hire_date: user.employee!.hire_date,
      salary_scale_level: 1,
      base_salary: user.employee!.base_salary,
      allowances: user.employee!.allowances,
      commission_rate: user.employee!.commission_rate,
      is_active: user.is_active,
      bank_account_number: user.employee!.bank_account_number,
      bank_name: user.employee!.bank_name,
      emergency_contact_name: user.employee!.emergency_contact_name,
      emergency_contact_phone: user.employee!.emergency_contact_phone,
      created_at: user.created_at,
      updated_at: user.updated_at,
      linkedToUser: true,
      userId: user.id
    })) || []),
    // الموظفين غير المرتبطين
    ...(unlinkedEmployees?.map(emp => ({
      id: emp.id,
      employee_code: emp.employee_code,
      full_name: emp.full_name,
      position: emp.position,
      department: emp.department,
      phone: undefined,
      email: undefined,
      national_id: undefined,
      hire_date: emp.hire_date,
      salary_scale_level: 1,
      base_salary: emp.base_salary,
      allowances: emp.allowances,
      commission_rate: emp.commission_rate,
      is_active: emp.is_active,
      bank_account_number: undefined,
      bank_name: undefined,
      emergency_contact_name: undefined,
      emergency_contact_phone: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      linkedToUser: false,
      userId: undefined
    })) || [])
  ];

  const filteredEmployees = allEmployees.filter(employee =>
    employee.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employee_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.position.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق من البيانات المطلوبة
    if (!newEmployee.full_name.trim()) {
      toast.error('الاسم الكامل مطلوب');
      return;
    }
    
    if (!newEmployee.employee_code.trim()) {
      toast.error('رقم الموظف مطلوب');
      return;
    }
    
    if (!newEmployee.position.trim()) {
      toast.error('المنصب مطلوب');
      return;
    }

    try {
      await addEmployee(newEmployee);
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
      toast.success('تم إضافة الموظف بنجاح');
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error('حدث خطأ أثناء إضافة الموظف');
    }
  };

  const handleLinkEmployee = async (employeeId: string) => {
    try {
      await linkUserToEmployee(employeeId);
      refreshAllData();
      toast.success('تم ربط الموظف بالمستخدم بنجاح');
    } catch (error) {
      console.error('Error linking employee:', error);
      toast.error('حدث خطأ أثناء ربط الموظف');
    }
  };

  const formatSalary = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const linkedEmployeesCount = allEmployees.filter(emp => emp.linkedToUser).length;
  const unlinkedEmployeesCount = allEmployees.filter(emp => !emp.linkedToUser).length;

  return (
    <div className="space-y-6">
      {/* رأس الصفحة */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">إدارة الموظفين</h2>
          <p className="text-gray-600">إدارة بيانات الموظفين ومعلوماتهم الأساسية (جميع الرواتب بالجنيه المصري)</p>
          {currentEmployee && (
            <div className="mt-2 p-2 bg-green-50 rounded-lg">
              <span className="text-green-800 text-sm">
                مرتبط بالموظف: {currentEmployee.full_name} ({currentEmployee.employee_code})
              </span>
            </div>
          )}
          
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Users className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-blue-800 text-sm">
                <strong>النظام الموحد:</strong> {linkedEmployeesCount} موظف مرتبط بمستخدمين، {unlinkedEmployeesCount} موظف غير مرتبط.
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
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={refreshAllData}
            disabled={unifiedLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${unifiedLoading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          
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
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    إلغاء
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* شريط البحث */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
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
          <Card key={employee.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  {employee.full_name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={employee.is_active ? "default" : "secondary"}>
                    {employee.is_active ? 'نشط' : 'معطل'}
                  </Badge>
                  {employee.linkedToUser && (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      مرتبط
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">رقم الموظف:</span>
                  <p className="font-medium">{employee.employee_code}</p>
                </div>
                <div>
                  <span className="text-gray-600">المنصب:</span>
                  <p className="font-medium">{employee.position}</p>
                </div>
                {employee.department && (
                  <div>
                    <span className="text-gray-600">القسم:</span>
                    <p className="font-medium">{employee.department}</p>
                  </div>
                )}
                <div>
                  <span className="text-gray-600">تاريخ التوظيف:</span>
                  <p className="font-medium">{new Date(employee.hire_date).toLocaleDateString('ar-EG')}</p>
                </div>
              </div>

              {/* معلومات الاتصال */}
              {(employee.phone || employee.email) && (
                <div className="border-t pt-3 space-y-2">
                  {employee.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span>{employee.phone}</span>
                    </div>
                  )}
                  {employee.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="truncate">{employee.email}</span>
                    </div>
                  )}
                </div>
              )}

              {/* معلومات الراتب */}
              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-gray-600">الراتب الأساسي:</span>
                  <span className="font-medium text-green-600">
                    {formatSalary(employee.base_salary)}
                  </span>
                </div>
                {employee.allowances > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-600 ml-6">البدلات:</span>
                    <span className="font-medium text-green-600">
                      {formatSalary(employee.allowances)}
                    </span>
                  </div>
                )}
              </div>

              {/* أزرار الإجراءات */}
              <div className="border-t pt-3 flex gap-2">
                {!employee.linkedToUser && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleLinkEmployee(employee.id)}
                    className="flex-1 flex items-center gap-2"
                  >
                    <Link className="h-4 w-4" />
                    ربط بمستخدم
                  </Button>
                )}
                <Button size="sm" variant="outline" className="flex-1">
                  تعديل
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'لا توجد نتائج' : 'لا توجد موظفين'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm 
                ? 'لم يتم العثور على موظفين يطابقون البحث الحالي'
                : 'ابدأ بإضافة موظف جديد لإدارة فريق العمل'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                إضافة موظف جديد
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EmployeeManagement;
