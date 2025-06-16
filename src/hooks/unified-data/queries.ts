import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UnifiedUser, UnlinkedEmployee } from './types';

export const useUnifiedUsersQuery = (isSuperAdmin: boolean) => {
  return useQuery({
    queryKey: ['unified-users-employees-all'],
    queryFn: async () => {
      console.log('🔄 جاري جلب البيانات الموحدة...');
      
      try {
        // جلب الـ profiles مع employees
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            *,
            employees(*)
          `)
          .order('created_at', { ascending: false });
        
        if (profilesError) {
          console.error('❌ خطأ في جلب بيانات profiles:', profilesError);
          throw profilesError;
        }

        // جلب user_roles بشكل منفصل
        const { data: userRolesData, error: userRolesError } = await supabase
          .from('user_roles')
          .select('user_id, role');
        
        if (userRolesError) {
          console.error('❌ خطأ في جلب بيانات user_roles:', userRolesError);
          throw userRolesError;
        }

        // دمج البيانات يدوياً
        const unified = profilesData?.map(profile => {
          const userRole = userRolesData?.find(ur => ur.user_id === profile.id);
          
          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            phone: profile.phone,
            department: profile.department,
            is_active: profile.is_active,
            role: (userRole?.role || 'no_role') as string,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            employee: profile.employees ? {
              id: profile.employees.id,
              employee_code: profile.employees.employee_code,
              full_name: profile.employees.full_name,
              position: profile.employees.position,
              department: profile.employees.department,
              hire_date: profile.employees.hire_date,
              base_salary: profile.employees.base_salary,
              allowances: profile.employees.allowances,
              commission_rate: profile.employees.commission_rate,
              bank_name: profile.employees.bank_name,
              bank_account_number: profile.employees.bank_account_number,
              national_id: profile.employees.national_id,
              emergency_contact_name: profile.employees.emergency_contact_name,
              emergency_contact_phone: profile.employees.emergency_contact_phone,
            } : undefined
          };
        }) || [];

        console.log('✅ تم جلب البيانات الموحدة:', unified.length);
        return unified as UnifiedUser[];
      } catch (error) {
        console.error('❌ خطأ في جلب البيانات الموحدة:', error);
        toast.error('حدث خطأ في جلب بيانات المستخدمين والموظفين');
        throw error;
      }
    },
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
};

export const useUnlinkedEmployeesQuery = (isSuperAdmin: boolean) => {
  return useQuery({
    queryKey: ['unlinked-employees-all'],
    queryFn: async () => {
      console.log('🔄 جاري جلب الموظفين غير المرتبطين...');
      
      try {
        // الطريقة المحسنة: استخدام LEFT JOIN بدلاً من الـ filter المعقد
        const { data, error } = await supabase
          .from('employees')
          .select(`
            *,
            profiles!left(id)
          `)
          .eq('is_active', true)
          .is('profiles.id', null)
          .order('full_name');
        
        if (error) {
          console.error('❌ خطأ في جلب الموظفين غير المرتبطين:', error);
          throw error;
        }
        
        // تنظيف البيانات - إزالة profiles من النتيجة
        const cleanedData = data?.map(employee => {
          const { profiles, ...employeeData } = employee;
          return employeeData;
        }) || [];
        
        console.log('✅ تم جلب الموظفين غير المرتبطين:', cleanedData.length);
        return cleanedData as UnlinkedEmployee[];
      } catch (error) {
        console.error('❌ خطأ في جلب الموظفين غير المرتبطين:', error);
        toast.error('حدث خطأ في جلب الموظفين غير المرتبطين');
        return [];
      }
    },
    enabled: isSuperAdmin,
    staleTime: 5 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
};
