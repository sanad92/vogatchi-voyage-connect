
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { UnifiedUser, UnlinkedEmployee } from './types';

export const useUnifiedUsersQuery = (isOwner: boolean, organizationId: string | null) => {
  return useQuery({
    queryKey: ['unified-users-employees', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      try {
        // Fetch profiles with employees
        const { data: profilesData, error: profilesError } = await (supabase
          .from('profiles')
          .select(`
            *,
            employees!profiles_linked_employee_id_fkey(*)
          `)
          .order('created_at', { ascending: false }) as any);
        
        if (profilesError) {
          console.error('❌ خطأ في جلب بيانات profiles:', profilesError);
          throw profilesError;
        }

        // Fetch organization members for role info
        const { data: membersData, error: membersError } = await supabase
          .from('organization_members')
          .select('user_id, role')
          .eq('organization_id', organizationId)
          .eq('is_active', true);
        
        if (membersError) {
          console.error('❌ خطأ في جلب بيانات organization_members:', membersError);
          throw membersError;
        }

        // Merge data
        const unified = profilesData?.map((profile: any) => {
          const member = membersData?.find(m => m.user_id === profile.id);
          
          return {
            id: profile.id,
            email: profile.email,
            full_name: profile.full_name,
            phone: profile.phone,
            department: profile.department,
            is_active: profile.is_active,
            role: (member?.role || 'viewer') as string,
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

        return unified as UnifiedUser[];
      } catch (error) {
        console.error('❌ خطأ في جلب البيانات الموحدة:', error);
        toast.error('حدث خطأ في جلب بيانات المستخدمين والموظفين');
        throw error;
      }
    },
    enabled: isOwner && !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
};

export const useUnlinkedEmployeesQuery = (isOwner: boolean) => {
  return useQuery({
    queryKey: ['unlinked-employees-all'],
    queryFn: async () => {
      try {
        const { data: allEmployees, error: employeesError } = await supabase
          .from('employees')
          .select('*')
          .eq('is_active', true)
          .order('full_name');
        
        if (employeesError) throw employeesError;
        
        const { data: linkedProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('linked_employee_id')
          .not('linked_employee_id', 'is', null);
        
        if (profilesError) throw profilesError;
        
        const linkedEmployeeIds = linkedProfiles?.map((p: any) => p.linked_employee_id).filter(Boolean) || [];
        
        const unlinkedEmployees = allEmployees?.filter(emp => 
          !linkedEmployeeIds.includes(emp.id)
        ) || [];
        
        return unlinkedEmployees as UnlinkedEmployee[];
      } catch (error: any) {
        console.error('❌ خطأ في جلب الموظفين غير المرتبطين:', error);
        toast.error('حدث خطأ في جلب الموظفين غير المرتبطين');
        return [];
      }
    },
    enabled: isOwner,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};
