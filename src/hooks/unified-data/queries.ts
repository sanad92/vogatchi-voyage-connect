
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
        // 1) Get organization members (only users in current org)
        const { data: membersData, error: membersError } = await supabase
          .from('organization_members')
          .select('user_id, role')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (membersError) {
          console.error('❌ خطأ في جلب بيانات organization_members:', membersError);
          throw membersError;
        }

        const userIds = (membersData || []).map((m: any) => m.user_id);
        if (userIds.length === 0) return [];

        // 2) Fetch profiles only for those users, with their linked employee
        const { data: profilesData, error: profilesError } = await (supabase
          .from('profiles')
          .select(`
            *,
            employees!profiles_linked_employee_id_fkey(*)
          `)
          .in('id', userIds)
          .order('created_at', { ascending: false }) as any);

        if (profilesError) {
          console.error('❌ خطأ في جلب بيانات profiles:', profilesError);
          throw profilesError;
        }

        // Merge data — only include the linked employee if it belongs to current org
        const unified = profilesData?.map((profile: any) => {
          const member = membersData?.find((m: any) => m.user_id === profile.id);
          const emp = profile.employees;
          const empBelongsToOrg = emp && emp.organization_id === organizationId;

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
            employee: empBelongsToOrg ? {
              id: emp.id,
              employee_code: emp.employee_code,
              full_name: emp.full_name,
              position: emp.position,
              department: emp.department,
              hire_date: emp.hire_date,
              base_salary: emp.base_salary,
              allowances: emp.allowances,
              commission_rate: emp.commission_rate,
              bank_name: emp.bank_name,
              bank_account_number: emp.bank_account_number,
              national_id: emp.national_id,
              emergency_contact_name: emp.emergency_contact_name,
              emergency_contact_phone: emp.emergency_contact_phone,
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

export const useUnlinkedEmployeesQuery = (isOwner: boolean, organizationId: string | null) => {
  return useQuery({
    queryKey: ['unlinked-employees-all', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      try {
        // Only employees of the current organization
        const { data: allEmployees, error: employeesError } = await supabase
          .from('employees')
          .select('*')
          .eq('organization_id', organizationId)
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
    enabled: isOwner && !!organizationId,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};
