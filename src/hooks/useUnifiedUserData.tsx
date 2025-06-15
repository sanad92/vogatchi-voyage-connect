
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

interface UnifiedUser {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  role?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    id: string;
    employee_code: string;
    position: string;
    hire_date: string;
    base_salary: number;
    allowances: number;
    commission_rate: number;
    bank_name?: string;
    bank_account_number?: string;
    national_id?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
  };
}

export const useUnifiedUserData = () => {
  const { isSuperAdmin } = useAuth();

  const { data: unifiedUsers, isLoading, refetch } = useQuery({
    queryKey: ['unified-users-employees'],
    queryFn: async () => {
      console.log('🔄 جاري جلب المستخدمين والموظفين...');
      
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select(`
            *,
            user_roles!inner(role),
            employees(*)
          `)
          .order('created_at', { ascending: false });
        
        if (profilesError) {
          console.error('❌ خطأ في جلب البيانات:', profilesError);
          throw profilesError;
        }

        const unified = profilesData?.map(profile => ({
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          phone: profile.phone,
          department: profile.department,
          is_active: profile.is_active,
          role: Array.isArray(profile.user_roles) && profile.user_roles.length > 0 
            ? profile.user_roles[0].role 
            : 'no_role',
          created_at: profile.created_at,
          updated_at: profile.updated_at,
          employee: profile.employees ? {
            id: profile.employees.id,
            employee_code: profile.employees.employee_code,
            position: profile.employees.position,
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
        })) || [];

        console.log('✅ تم جلب البيانات الموحدة:', unified.length);
        return unified as UnifiedUser[];
      } catch (error) {
        console.error('❌ خطأ في جلب البيانات الموحدة:', error);
        toast.error('حدث خطأ في جلب بيانات المستخدمين والموظفين');
        throw error;
      }
    },
    enabled: isSuperAdmin(),
  });

  return {
    unifiedUsers,
    isLoading,
    refetch,
  };
};
