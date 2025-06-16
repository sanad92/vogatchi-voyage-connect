
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Employee } from '@/types/expenses';

export const useEmployees = () => {
  const queryClient = useQueryClient();

  // جلب الموظفين
  const { data: employees, isLoading: employeesLoading, error } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      console.log('🔄 جاري جلب الموظفين...');
      
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('is_active', true)
          .order('full_name');

        if (error) {
          console.error('❌ خطأ في جلب الموظفين:', error);
          throw error;
        }
        
        console.log('✅ تم جلب الموظفين:', data?.length || 0);
        return data as Employee[];
      } catch (error) {
        console.error('❌ خطأ في useEmployees:', error);
        toast.error('حدث خطأ في جلب بيانات الموظفين');
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });

  // إضافة موظف جديد
  const addEmployeeMutation = useMutation({
    mutationFn: async (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('🔄 إضافة موظف جديد:', employee);
      
      try {
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
      } catch (error) {
        console.error('❌ خطأ في إضافة الموظف:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('✅ نجح إضافة الموظف - تحديث البيانات...');
      
      // تحديث جميع الـ caches المرتبطة
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      
      toast.success(`تم إضافة الموظف "${data.full_name}" بنجاح`);
    },
    onError: (error: any) => {
      console.error('❌ خطأ في إضافة الموظف:', error);
      const errorMessage = error?.message || 'حدث خطأ أثناء إضافة الموظف';
      toast.error(errorMessage);
    },
  });

  const addEmployee = (employee: Omit<Employee, 'id' | 'created_at' | 'updated_at'>) => {
    console.log('🚀 بدء إضافة موظف:', employee);
    addEmployeeMutation.mutate(employee);
  };

  return {
    employees,
    employeesLoading,
    employeesError: error,
    addEmployee,
    isAddingEmployee: addEmployeeMutation.isPending,
    addEmployeeError: addEmployeeMutation.error,
  };
};
