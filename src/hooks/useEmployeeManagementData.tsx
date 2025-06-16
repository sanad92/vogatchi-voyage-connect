
import { useMemo } from 'react';
import { useUnifiedData } from '@/hooks/useUnifiedData';

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

  // Transform and merge employee data
  const allEmployees: EnhancedEmployee[] = useMemo(() => [
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
  ], [unifiedUsers, unlinkedEmployees]);

  // Calculate statistics
  const stats = useMemo(() => ({
    total: allEmployees.length,
    active: allEmployees.filter(emp => emp.is_active).length,
    inactive: allEmployees.filter(emp => !emp.is_active).length,
    linked: allEmployees.filter(emp => emp.linkedToUser).length,
    unlinked: allEmployees.filter(emp => !emp.linkedToUser).length
  }), [allEmployees]);

  return {
    allEmployees,
    stats,
    unifiedLoading,
    usersError,
    refreshAllData
  };
};

export type { EnhancedEmployee };
