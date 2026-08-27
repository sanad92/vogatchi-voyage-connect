import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';
import type { OrgRole } from '@/lib/accessControl';
import type { Database } from '@/integrations/supabase/types';

type OrganizationMembership = Pick<
  Database['public']['Tables']['organization_members']['Row'],
  'id' | 'user_id' | 'role' | 'is_active' | 'joined_at'
>;

type ProfileSummary = Pick<
  Database['public']['Tables']['profiles']['Row'],
  'id' | 'full_name' | 'email' | 'phone' | 'linked_employee_id'
>;

type EmployeeSummary = Pick<
  Database['public']['Tables']['employees']['Row'],
  'id' | 'employee_code' | 'position' | 'department' | 'base_salary' | 'hire_date'
>;

const getErrorMessage = (error: unknown, fallback: string) => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string' &&
    error.message
  ) {
    return error.message;
  }

  return fallback;
};

const hasErrorCode = (error: unknown, code: string) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === code;

export interface TeamMember {
  membership_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  joined_at: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  linked_employee_id: string | null;
  employee?: {
    id: string;
    employee_code: string;
    position: string | null;
    department: string | null;
    base_salary: number | null;
    hire_date: string | null;
  } | null;
}

export interface NewTeamMemberInput {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  org_role: 'admin' | 'manager' | 'agent' | 'viewer';
  employee_data?: {
    position?: string;
    department?: string;
    base_salary?: number;
    hire_date?: string;
    employee_code?: string;
  };
}

export interface EmailCheckResult {
  success: boolean;
  exists: boolean;
  in_org?: boolean;
  user_id?: string;
  full_name?: string | null;
  role?: string;
  membership_active?: boolean;
}

export interface ReassignSeatInput {
  user_id: string;
  full_name: string;
  phone?: string;
  password?: string;
  org_role: 'admin' | 'manager' | 'agent' | 'viewer';
  employee_data?: NewTeamMemberInput['employee_data'];
}

export const useTeamManagement = () => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members', orgId],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!orgId) return [];

      const { data: memberships, error: memErr } = await supabase
        .from('organization_members')
        .select('id, user_id, role, is_active, joined_at')
        .eq('organization_id', orgId)
        .order('joined_at', { ascending: true });

      if (memErr) throw memErr;
      if (!memberships?.length) return [];

      const userIds = memberships.map((m) => m.user_id);

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, linked_employee_id')
        .in('id', userIds);

      const profileRows: ProfileSummary[] = profiles || [];
      const membershipRows: OrganizationMembership[] = memberships;

      const linkedEmpIds = profileRows
        .map((profile) => profile.linked_employee_id)
        .filter(Boolean) as string[];

      let employees: EmployeeSummary[] = [];
      if (linkedEmpIds.length) {
        const { data: emps } = await supabase
          .from('employees')
          .select('id, employee_code, position, department, base_salary, hire_date')
          .in('id', linkedEmpIds);
        employees = emps || [];
      }

      const profMap = new Map<string, ProfileSummary>(
        profileRows.map((profile) => [profile.id, profile]),
      );
      const empMap = new Map<string, EmployeeSummary>(
        employees.map((employee) => [employee.id, employee]),
      );

      return membershipRows.map((membership) => {
        const profile = profMap.get(membership.user_id);
        const emp = profile?.linked_employee_id ? empMap.get(profile.linked_employee_id) : null;
        return {
          membership_id: membership.id,
          user_id: membership.user_id,
          role: membership.role,
          is_active: membership.is_active,
          joined_at: membership.joined_at,
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? '',
          phone: profile?.phone ?? null,
          linked_employee_id: profile?.linked_employee_id ?? null,
          employee: emp ?? null,
        } as TeamMember;
      });
    },
    enabled: !!orgId,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['team-members', orgId] });
    queryClient.invalidateQueries({ queryKey: ['org-members', orgId] });
    queryClient.invalidateQueries({ queryKey: ['employees', orgId] });
  };

  const addMember = useMutation({
    mutationFn: async (_input: NewTeamMemberInput) => {
      throw new Error('إضافة الأعضاء متاحة بالدعوة فقط لحماية كلمة المرور وهوية الموظف');
    },
    onSuccess: () => {
      invalidate();
      toast.success('تم إضافة عضو جديد بنجاح');
    },
    onError: (error: unknown) => {
      // EMAIL_EXISTS is handled inline by the wizard (seat reuse flow)
      if (hasErrorCode(error, 'EMAIL_EXISTS')) return;
      toast.error(getErrorMessage(error, 'حدث خطأ'));
    },
  });

  const checkEmail = async (email: string): Promise<EmailCheckResult> => {
    void email;
    throw new Error('التحقق وإضافة الأعضاء يتمان تلقائياً من خلال الدعوة');
  };

  const reassignSeat = useMutation({
    mutationFn: async (_input: ReassignSeatInput) => {
      throw new Error('لا يمكن إعادة استخدام هوية موظف سابق؛ أرسل دعوة بحساب مستقل');
    },
    onSuccess: () => {
      invalidate();
      toast.success('تمت إعادة تعيين الحساب للموظف الجديد');
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'حدث خطأ')),
  });

  const offboardMember = useMutation({
    mutationFn: async (input: { membershipId: string; terminationDate?: string; note?: string }) => {
      if (!orgId) throw new Error('لا توجد مؤسسة محددة');
      const { data, error } = await supabase.rpc('manage_organization_member', {
        _membership_id: input.membershipId,
        _new_role: null,
        _is_active: false,
        _termination_date: input.terminationDate || null,
        _note: input.note || null,
      });
      if (error) throw error;
      return data as unknown as { success?: boolean };
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      toast.success('تم إنهاء الخدمة وتحرير المقعد');
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'حدث خطأ')),
  });


  const updateRole = useMutation({
    mutationFn: async ({ membershipId, newRole }: { membershipId: string; newRole: OrgRole }) => {
      const { error } = await supabase.rpc('manage_organization_member', {
        _membership_id: membershipId,
        _new_role: newRole,
        _is_active: null,
        _termination_date: null,
        _note: null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('تم تحديث الدور'); },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'فشل التحديث')),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ membershipId, isActive }: { membershipId: string; isActive: boolean }) => {
      const { error } = await supabase.rpc('manage_organization_member', {
        _membership_id: membershipId,
        _new_role: null,
        _is_active: isActive,
        _termination_date: null,
        _note: null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('تم تحديث الحالة'); },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'فشل التحديث')),
  });

  const removeMember = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase.rpc('manage_organization_member', {
        _membership_id: membershipId,
        _new_role: null,
        _is_active: false,
        _termination_date: null,
        _note: null,
      });
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('تم إزالة العضو'); },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'فشل الإزالة')),
  });

  const resetPassword = useMutation({
    mutationFn: async (_input: { userId: string; password: string }) => {
      throw new Error('إعادة كلمة المرور تتم من رابط «نسيت كلمة المرور» بواسطة صاحب الحساب');
    },
    onSuccess: () => toast.success('تم إعادة تعيين كلمة المرور'),
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'فشل التحديث')),
  });

  const updateEmployeeData = useMutation({
    mutationFn: async ({
      employeeId,
      updates,
    }: {
      employeeId: string;
      updates: { position?: string; department?: string; base_salary?: number; hire_date?: string };
    }) => {
      const { error } = await supabase.from('employees').update(updates).eq('id', employeeId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('تم تحديث بيانات الموظف'); },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'فشل التحديث')),
  });

  return {
    members,
    isLoading,
    addMember,
    updateRole,
    toggleActive,
    removeMember,
    resetPassword,
    updateEmployeeData,
    checkEmail,
    reassignSeat,
    offboardMember,
  };
};
