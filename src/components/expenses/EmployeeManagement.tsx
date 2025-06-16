
import { useState } from 'react';
import { useUnifiedData } from '@/hooks/useUnifiedData';
import { useEmployees } from '@/hooks/useEmployees';
import { useUserEmployeeMapping } from '@/hooks/useUserEmployeeMapping';
import { toast } from 'sonner';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import EmployeeStatsHeader from './employee-management/EmployeeStatsHeader';
import EmployeeFilters from './employee-management/EmployeeFilters';
import EmployeeCard from './employee-management/EmployeeCard';
import EmployeeEmptyState from './employee-management/EmployeeEmptyState';
import EmployeeFormDialog from './employee-management/EmployeeFormDialog';
import { useEmployeeForm } from './employee-management/useEmployeeForm';

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
  const { addEmployee, isAddingEmployee, employeesError } = useEmployees();
  const { linkUserToEmployee } = useUserEmployeeMapping();
  const { 
    unifiedUsers, 
    unlinkedEmployees, 
    isLoading: unifiedLoading, 
    refreshAllData,
    usersError 
  } = useUnifiedData();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { newEmployee, setNewEmployee, resetForm, validateForm } = useEmployeeForm();

  console.log('📊 حالة البيانات الموحدة:', {
    unifiedUsers: unifiedUsers?.length || 0,
    unlinkedEmployees: unlinkedEmployees?.length || 0,
    unifiedLoading,
    isRefreshing,
    usersError,
    employeesError
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
    
    console.log('📝 بدء عملية إضافة موظف...');
    
    if (!validateForm()) {
      console.log('❌ النموذج غير صحيح');
      return;
    }

    try {
      console.log('🚀 إضافة الموظف...', newEmployee);
      
      // إضافة الموظف
      await addEmployee(newEmployee);
      
      console.log('✅ تم إضافة الموظف بنجاح');
      
      // انتظار قصير ثم تحديث البيانات الموحدة
      setTimeout(async () => {
        console.log('🔄 تحديث البيانات الموحدة...');
        await handleRefreshData();
      }, 1000);
      
      // إغلاق النافذة وإعادة تعيين البيانات
      setIsAddDialogOpen(false);
      resetForm();
      
    } catch (error) {
      console.error('❌ خطأ في إضافة الموظف:', error);
      toast.error('حدث خطأ أثناء إضافة الموظف');
    }
  };

  const handleLinkEmployee = async (employeeId: string) => {
    console.log('🔗 بدء ربط الموظف:', employeeId);
    
    try {
      const success = await linkUserToEmployee(employeeId);
      if (success) {
        console.log('✅ تم ربط الموظف بنجاح');
        
        // تحديث البيانات بعد الربط
        setTimeout(async () => {
          await handleRefreshData();
        }, 1000);
        
        toast.success('تم ربط الموظف بالمستخدم بنجاح');
      }
    } catch (error) {
      console.error('❌ خطأ في ربط الموظف:', error);
      toast.error('حدث خطأ أثناء ربط الموظف');
    }
  };

  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      console.log('🔄 تحديث جميع البيانات...');
      await refreshAllData();
      console.log('✅ تم تحديث البيانات بنجاح');
      toast.success('تم تحديث البيانات بنجاح');
    } catch (error) {
      console.error('❌ خطأ في تحديث البيانات:', error);
      toast.error('حدث خطأ أثناء تحديث البيانات');
    } finally {
      setIsRefreshing(false);
    }
  };

  const linkedEmployeesCount = allEmployees.filter(emp => emp.linkedToUser).length;
  const unlinkedEmployeesCount = allEmployees.filter(emp => !emp.linkedToUser).length;

  // عرض رسالة الخطأ إذا كان هناك خطأ في البيانات
  if (usersError || employeesError) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            حدث خطأ في تحميل البيانات. يرجى المحاولة مرة أخرى.
            <div className="mt-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefreshData}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                إعادة المحاولة
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // عرض رسالة التحميل
  if (unifiedLoading && !isRefreshing) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل بيانات الموظفين...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <EmployeeStatsHeader
        linkedEmployeesCount={linkedEmployeesCount}
        unlinkedEmployeesCount={unlinkedEmployeesCount}
        isRefreshing={isRefreshing}
        unifiedLoading={unifiedLoading}
        onRefresh={handleRefreshData}
        onAddEmployee={() => setIsAddDialogOpen(true)}
      />

      <EmployeeFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {filteredEmployees.length === 0 ? (
        <EmployeeEmptyState
          searchTerm={searchTerm}
          onAddEmployee={() => setIsAddDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmployees.map((employee) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              onLinkEmployee={handleLinkEmployee}
            />
          ))}
        </div>
      )}

      <EmployeeFormDialog
        isOpen={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        newEmployee={newEmployee}
        setNewEmployee={setNewEmployee}
        onSubmit={handleSubmit}
        isAddingEmployee={isAddingEmployee}
      />
    </div>
  );
};

export default EmployeeManagement;
