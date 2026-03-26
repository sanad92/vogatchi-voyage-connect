import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { UnifiedUser, UnlinkedEmployee } from './types';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];
type EmployeeRow = Database['public']['Tables']['employees']['Row'];
type OrganizationMemberRow = Pick<
  Database['public']['Tables']['organization_members']['Row'],
  'user_id' | 'role'
>;

const toUnifiedEmployee = (employee: EmployeeRow): UnifiedUser['employee'] => ({
  id: employee.id,
  employee_code: employee.employee_code,
  full_name: employee.full_name,
  position: employee.position ?? '',
  department: employee.department ?? '',
  hire_date: employee.hire_date ?? '',
  base_salary: employee.base_salary ?? 0,
  allowances: employee.allowances ?? 0,
  commission_rate: employee.commission_rate ?? undefined,
  bank_name: employee.bank_name ?? undefined,
  bank_account_number: employee.bank_account_number ?? undefined,
  national_id: employee.national_id ?? undefined,
  emergency_contact_name: employee.emergency_contact_name ?? undefined,
  emergency_contact_phone: employee.emergency_contact_phone ?? undefined,
});

const buildUnifiedUsers = (
  members: OrganizationMemberRow[],
  profiles: ProfileRow[],
  employeesById: Map<string, EmployeeRow>
): UnifiedUser[] => {
  const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

  return members.map((member) => {
    const profile = profilesById.get(member.user_id);
    const linkedEmployee =
      profile?.linked_employee_id ? employeesById.get(profile.linked_employee_id) : undefined;

    return {
      id: member.user_id,
      email: profile?.email ?? '',
      full_name: profile?.full_name ?? 'مستخدم بدون ملف شخصي',
      phone: profile?.phone ?? undefined,
      department: profile?.department ?? undefined,
      is_active: profile?.is_active ?? true,
      role: member.role,
      created_at: profile?.created_at ?? '',
      updated_at: profile?.updated_at ?? '',
      employee: linkedEmployee ? toUnifiedEmployee(linkedEmployee) : undefined,
    };
  });
};

export const useUnifiedUsersQuery = (canManage: boolean, organizationId: string | null) => {
  return useQuery({
    queryKey: ['unified-users-employees', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      try {
        const { data: membersData, error: membersError } = await supabase
          .from('organization_members')
          .select('user_id, role')
          .eq('organization_id', organizationId)
          .eq('is_active', true);

        if (membersError) throw membersError;

        const members = (membersData ?? []) as OrganizationMemberRow[];
        const userIds = members.map((member) => member.user_id);

        if (!userIds.length) {
          return [] as UnifiedUser[];
        }

        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds)
          .order('created_at', { ascending: false });

        if (profilesError) throw profilesError;

        const profiles = (profilesData ?? []) as ProfileRow[];
        const linkedEmployeeIds = profiles
          .map((profile) => profile.linked_employee_id)
          .filter((employeeId): employeeId is string => Boolean(employeeId));

        const employeesById = new Map<string, EmployeeRow>();
        if (linkedEmployeeIds.length) {
          const { data: employeesData, error: employeesError } = await supabase
            .from('employees')
            .select('*')
            .in('id', linkedEmployeeIds);

          if (employeesError) throw employeesError;

          (employeesData ?? []).forEach((employee) => {
            employeesById.set(employee.id, employee);
          });
        }

        return buildUnifiedUsers(members, profiles, employeesById);
      } catch (queryError) {
        console.error('خطأ في جلب البيانات الموحدة:', queryError);
        toast.error('حدث خطأ في جلب بيانات المستخدمين والموظفين');
        throw queryError;
      }
    },
    enabled: canManage && !!organizationId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
    retryDelay: 1000,
  });
};

export const useUnlinkedEmployeesQuery = (canManage: boolean, organizationId: string | null) => {
  return useQuery({
    queryKey: ['unlinked-employees-all', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];

      try {
        const { data: employeesData, error: employeesError } = await supabase
          .from('employees')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('is_active', true)
          .order('full_name');

        if (employeesError) throw employeesError;

        const employees = (employeesData ?? []) as EmployeeRow[];
        const employeeIds = employees.map((employee) => employee.id);

        if (!employeeIds.length) {
          return [] as UnlinkedEmployee[];
        }

        const { data: linkedProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('linked_employee_id')
          .in('linked_employee_id', employeeIds);

        if (profilesError) throw profilesError;

        const linkedEmployeeIds = new Set(
          (linkedProfiles ?? [])
            .map((profile) => profile.linked_employee_id)
            .filter((employeeId): employeeId is string => Boolean(employeeId))
        );

        return employees.filter((employee) => !linkedEmployeeIds.has(employee.id)) as UnlinkedEmployee[];
      } catch (queryError) {
        console.error('خطأ في جلب الموظفين غير المرتبطين:', queryError);
        toast.error('حدث خطأ في جلب الموظفين غير المرتبطين');
        return [];
      }
    },
    enabled: canManage && !!organizationId,
    staleTime: 5 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
  });
};
