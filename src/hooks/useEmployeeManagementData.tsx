
import { useMemo } from 'react';
import { useUnifiedData } from '@/hooks/useUnifiedData';

interface EnhancedEmployee {
  id: string;
  employee_code: string;
  full_name: string; // الاسم المعروض الرئيسي
  employee_full_name: string; // اسم الموظف الأصلي
  user_full_name?: string; // اسم المستخدم (إذا كان مرتبط)
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

export const useEmployeeManagementData = () => {
  const { 
    unifiedUsers, 
    unlinkedEmployees, 
    isLoading: unifiedLoading, 
    refreshAllData: originalRefreshAllData,
    usersError 
  } = useUnifiedData();

  // Wrap refreshAllData to return a Promise
  const refreshAllData = async (): Promise<void> => {
    return originalRefreshAllData();
  };

  // Transform and merge employee data with uniqueness protection
  const allEmployees: EnhancedEmployee[] = useMemo(() => {
    const employeeMap = new Map<string, EnhancedEmployee>();
    
    // أولاً: إضافة الموظفين المرتبطين بمستخدمين (أولوية أعلى)
    if (unifiedUsers) {
      unifiedUsers.filter(user => user.employee).forEach(user => {
        const employee = user.employee!;
        employeeMap.set(employee.id, {
          id: employee.id,
          employee_code: employee.employee_code,
          full_name: employee.full_name, // استخدام اسم الموظف كاسم رئيسي
          employee_full_name: employee.full_name, // الاحتفاظ باسم الموظف الأصلي
          user_full_name: user.full_name, // اسم المستخدم
          position: employee.position,
          department: user.department || employee.department || '',
          phone: user.phone,
          email: user.email,
          national_id: employee.national_id,
          hire_date: employee.hire_date,
          salary_scale_level: 1,
          base_salary: employee.base_salary,
          allowances: employee.allowances,
          commission_rate: employee.commission_rate,
          is_active: user.is_active,
          bank_account_number: employee.bank_account_number,
          bank_name: employee.bank_name,
          emergency_contact_name: employee.emergency_contact_name,
          emergency_contact_phone: employee.emergency_contact_phone,
          created_at: user.created_at,
          updated_at: user.updated_at,
          linkedToUser: true,
          userId: user.id
        });
      });
    }

    // ثانياً: إضافة الموظفين غير المرتبطين (فقط إذا لم يكونوا موجودين بالفعل)
    if (unlinkedEmployees) {
      unlinkedEmployees.forEach(emp => {
        // التحقق من عدم وجود الموظف بالفعل
        if (!employeeMap.has(emp.id)) {
          employeeMap.set(emp.id, {
            id: emp.id,
            employee_code: emp.employee_code,
            full_name: emp.full_name,
            employee_full_name: emp.full_name, // نفس الاسم للموظفين غير المرتبطين
            user_full_name: undefined, // لا يوجد مستخدم مرتبط
            position: emp.position,
            department: emp.department,
            phone: emp.phone,
            email: emp.email,
            national_id: emp.national_id,
            hire_date: emp.hire_date,
            salary_scale_level: 1,
            base_salary: emp.base_salary,
            allowances: emp.allowances,
            commission_rate: emp.commission_rate,
            is_active: emp.is_active,
            bank_account_number: emp.bank_account_number,
            bank_name: emp.bank_name,
            emergency_contact_name: emp.emergency_contact_name,
            emergency_contact_phone: emp.emergency_contact_phone,
            created_at: emp.created_at || new Date().toISOString(),
            updated_at: emp.updated_at || new Date().toISOString(),
            linkedToUser: false,
            userId: undefined
          });
        }
      });
    }

    // تحويل Map إلى Array
    return Array.from(employeeMap.values());
  }, [unifiedUsers, unlinkedEmployees]);

  // Calculate statistics
  const stats = useMemo(() => ({
    total: allEmployees.length,
    active: allEmployees.filter(emp => emp.is_active).length,
    inactive: allEmployees.filter(emp => !emp.is_active).length,
    linked: allEmployees.filter(emp => emp.linkedToUser).length,
    unlinked: allEmployees.filter(emp => !emp.linkedToUser).length
  }), [allEmployees]);

  console.log('🔄 معالجة البيانات المحسنة:', {
    unifiedUsersWithEmployees: unifiedUsers?.filter(u => u.employee).length || 0,
    unlinkedEmployees: unlinkedEmployees?.length || 0,
    finalAllEmployees: allEmployees.length,
    stats
  });

  return {
    allEmployees,
    stats,
    unifiedLoading,
    usersError,
    refreshAllData
  };
};

export type { EnhancedEmployee };
