import { useQueryClient } from '@tanstack/react-query';
import { useEmployees } from '@/hooks/useEmployees';
import { useOrgId } from '@/hooks/useOrgId';

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

export function useEmployeeManagementData() {
  const orgId = useOrgId();
  const client = useQueryClient();
  const { employees, employeesLoading, employeesError } = useEmployees(true);
  const allEmployees: EnhancedEmployee[] = (employees ?? []).map(employee => ({
    ...employee,
    employee_full_name: employee.full_name,
    department: employee.department ?? '',
    linkedToUser: Boolean(employee.linked_user_id),
    userId: employee.linked_user_id ?? undefined,
  }));
  const linked = allEmployees.filter(employee => employee.linkedToUser).length;
  const active = allEmployees.filter(employee => employee.is_active).length;
  return {
    allEmployees,
    stats: { total: allEmployees.length, active, inactive: allEmployees.length - active, linked, unlinked: allEmployees.length - linked },
    unifiedLoading: employeesLoading,
    employeesError,
    refreshAllData: () => client.invalidateQueries({ queryKey: ['employees', orgId] }),
  };
}

export type { EnhancedEmployee };
