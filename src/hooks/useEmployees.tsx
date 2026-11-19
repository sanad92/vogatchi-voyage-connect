
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Employee } from '@/types/expenses';
import { useOrgId } from './useOrgId';
import { useOptimizedAuth } from './useOptimizedAuth';
import { useHrAccess } from './useHrAccess';

export const useEmployees = (includeInactive = false) => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const { canManagePayroll, canManageCommissions, canViewFiles } = useHrAccess();

  const { data: employees, isLoading: employeesLoading, error } = useQuery({
    queryKey: ['employees', orgId, user?.id, includeInactive, canViewFiles, canManagePayroll, canManageCommissions],
    queryFn: async () => {
      const query = supabase.from('employee_directory').select('*').eq('organization_id', orgId!);
      if (!includeInactive) query.eq('is_active', true);
      const { data, error } = await query.order('full_name');
      if (error) throw error;
      return data.map(row => ({
        ...row,
        position: row.position ?? '',
        department: row.department ?? undefined,
        hire_date: row.hire_date ?? '',
        salary_scale_level: row.salary_scale_level ?? 1,
        base_salary: row.base_salary ?? 0,
        allowances: row.allowances ?? 0,
      })) as (Employee & { linked_user_id: string | null })[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    enabled: !!orgId,
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
      if (!orgId) throw new Error('تعذّر تحديد المؤسسة');
      const employeeCode = employee.employee_code.trim();
      const { data: existingEmployee, error: codeError } = await supabase.from('employees')
        .select('id').eq('organization_id', orgId).eq('employee_code', employeeCode).maybeSingle();
      if (codeError) throw codeError;
      if (existingEmployee) throw new Error(`رقم الموظف "${employeeCode}" مستخدم بالفعل`);

      const email = employee.email?.trim();
      if (email) {
        const { data: existingEmail, error: emailError } = await supabase.from('employees')
          .select('id').eq('organization_id', orgId).eq('email', email).maybeSingle();
        if (emailError) throw emailError;
        if (existingEmail) throw new Error(`البريد الإلكتروني "${email}" مستخدم بالفعل`);
      }

      const { data, error } = await supabase.from('employees').insert({
        ...employee,
        organization_id: orgId,
        employee_code: employeeCode,
        email: email || null,
        base_salary: canManagePayroll ? employee.base_salary : undefined,
        allowances: canManagePayroll ? employee.allowances : undefined,
        bank_name: canManagePayroll ? employee.bank_name || null : undefined,
        bank_account_number: canManagePayroll ? employee.bank_account_number || null : undefined,
        commission_rate: canManageCommissions ? employee.commission_rate : undefined,
        commission_type: canManageCommissions ? employee.commission_type : undefined,
        total_commission_earned: undefined,
      }).select('id, full_name').single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      toast.success(`تم إضافة الموظف "${data.full_name}" بنجاح`);
    },
    onError: (error: any) => {
      toast.error(error?.message || 'حدث خطأ أثناء إضافة الموظف');
    },
  });

  return {
    employees, employeesLoading, employeesError: error,
    addEmployee: addEmployeeMutation.mutate, addEmployeeAsync: addEmployeeMutation.mutateAsync,
    isAddingEmployee: addEmployeeMutation.isPending, addEmployeeError: addEmployeeMutation.error,
  };
};
