
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Employee } from '@/types/expenses';

export const useEmployees = () => {
  const queryClient = useQueryClient();

  // جلب الموظفين
  const { data: employees, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data as Employee[];
    },
  });

  // إضافة موظف جديد
  const addEmployeeMutation = useMutation({
    mutationFn: async (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('employees')
        .insert(employee)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "تمت الإضافة بنجاح",
        description: "تم إضافة الموظف الجديد بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في الإضافة",
        description: "حدث خطأ أثناء إضافة الموظف",
        variant: "destructive",
      });
    },
  });

  const addEmployee = (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    addEmployeeMutation.mutate(employee);
  };

  return {
    employees,
    employeesLoading,
    addEmployee,
    isAddingEmployee: addEmployeeMutation.isPending,
  };
};
