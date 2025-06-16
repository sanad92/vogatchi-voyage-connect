
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
      console.log('🔄 إضافة موظف جديد:', employee);
      
      const { data, error } = await supabase
        .from('employees')
        .insert(employee)
        .select()
        .single();

      if (error) {
        console.error('❌ خطأ في إضافة الموظف:', error);
        throw error;
      }
      
      console.log('✅ تم إضافة الموظف بنجاح:', data);
      return data;
    },
    onSuccess: (data) => {
      console.log('✅ نجح إضافة الموظف - تحديث البيانات...');
      
      // تحديث جميع الـ caches المرتبطة بالموظفين والبيانات الموحدة
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      
      toast.success('تم إضافة الموظف بنجاح');
    },
    onError: (error: any) => {
      console.error('❌ خطأ في إضافة الموظف:', error);
      toast.error(error.message || 'حدث خطأ أثناء إضافة الموظف');
    },
  });

  const addEmployee = (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    console.log('🚀 بدء إضافة موظف:', employee);
    addEmployeeMutation.mutate(employee);
  };

  return {
    employees,
    employeesLoading,
    addEmployee,
    isAddingEmployee: addEmployeeMutation.isPending,
  };
};
