
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Employee } from '@/types/expenses';
import { useOrgId } from './useOrgId';

export const useEmployees = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data: employees, isLoading: employeesLoading, error } = useQuery({
    queryKey: ['employees', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as Employee[];
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
    enabled: !!orgId,
  });

  const addEmployeeMutation = useMutation({
    mutationFn: async (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: existingEmployee } = await supabase.from('employees').select('id').eq('employee_code', employee.employee_code).single();
      if (existingEmployee) throw new Error(`رقم الموظف "${employee.employee_code}" مستخدم بالفعل`);

      if (employee.email) {
        const { data: existingEmailEmployee } = await supabase.from('employees').select('id').eq('email', employee.email).single();
        if (existingEmailEmployee) throw new Error(`البريد الإلكتروني "${employee.email}" مستخدم بالفعل`);
      }

      const { data, error } = await supabase
        .from('employees')
        .insert({ ...employee, organization_id: orgId })
        .select().single();
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

  const addEmployee = (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    addEmployeeMutation.mutate(employee);
  };

  return {
    employees, employeesLoading, employeesError: error,
    addEmployee, isAddingEmployee: addEmployeeMutation.isPending, addEmployeeError: addEmployeeMutation.error,
  };
};
