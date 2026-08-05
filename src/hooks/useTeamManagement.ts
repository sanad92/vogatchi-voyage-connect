import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

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

      const linkedEmpIds = (profiles || [])
        .map((p: any) => p.linked_employee_id)
        .filter(Boolean) as string[];

      let employees: any[] = [];
      if (linkedEmpIds.length) {
        const { data: emps } = await supabase
          .from('employees')
          .select('id, employee_code, position, department, base_salary, hire_date')
          .in('id', linkedEmpIds);
        employees = emps || [];
      }

      const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const empMap = new Map(employees.map((e: any) => [e.id, e]));

      return memberships.map((m: any) => {
        const profile: any = profMap.get(m.user_id);
        const emp = profile?.linked_employee_id ? empMap.get(profile.linked_employee_id) : null;
        return {
          membership_id: m.id,
          user_id: m.user_id,
          role: m.role,
          is_active: m.is_active,
          joined_at: m.joined_at,
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
    mutationFn: async (input: NewTeamMemberInput) => {
      if (!orgId) throw new Error('لا توجد مؤسسة محددة');
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'create_team_member',
          organization_id: orgId,
          ...input,
        },
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        const err: any = new Error(result?.message || 'فشل إضافة العضو');
        err.code = result?.code;
        throw err;
      }
      return result;
    },
    onSuccess: () => {
      invalidate();
      toast.success('تم إضافة عضو جديد بنجاح');
    },
    onError: (e: any) => {
      // EMAIL_EXISTS is handled inline by the wizard (seat reuse flow)
      if (e?.code === 'EMAIL_EXISTS') return;
      toast.error(e?.message || 'حدث خطأ');
    },
  });

  const checkEmail = async (email: string): Promise<EmailCheckResult> => {
    if (!orgId) throw new Error('لا توجد مؤسسة محددة');
    const { data, error } = await supabase.functions.invoke('admin-user-management', {
      body: { action: 'check_team_email', organization_id: orgId, email },
    });
    if (error) throw error;
    const result = Array.isArray(data) ? data[0] : data;
    if (!result?.success) throw new Error(result?.message || 'تعذر التحقق من البريد الإلكتروني');
    return result as EmailCheckResult;
  };

  const reassignSeat = useMutation({
    mutationFn: async (input: ReassignSeatInput) => {
      if (!orgId) throw new Error('لا توجد مؤسسة محددة');
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'reassign_team_seat', organization_id: orgId, ...input },
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) throw new Error(result?.message || 'فشل إعادة تعيين الحساب');
      return result;
    },
    onSuccess: () => {
      invalidate();
      toast.success('تمت إعادة تعيين الحساب للموظف الجديد');
    },
    onError: (e: any) => toast.error(e?.message || 'حدث خطأ'),
  });

  const offboardMember = useMutation({
    mutationFn: async (input: { userId: string; terminationDate?: string; note?: string }) => {
      if (!orgId) throw new Error('لا توجد مؤسسة محددة');
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'offboard_member',
          organization_id: orgId,
          user_id: input.userId,
          termination_date: input.terminationDate,
          note: input.note,
        },
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) throw new Error(result?.message || 'فشل إنهاء الخدمة');
      return result;
    },
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      toast.success('تم إنهاء الخدمة وتحرير المقعد');
    },
    onError: (e: any) => toast.error(e?.message || 'حدث خطأ'),
  });


  const updateRole = useMutation({
    mutationFn: async ({ membershipId, newRole }: { membershipId: string; newRole: string }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole as any })
        .eq('id', membershipId)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('تم تحديث الدور'); },
    onError: (e: any) => toast.error(e?.message || 'فشل التحديث'),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ membershipId, isActive }: { membershipId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ is_active: isActive })
        .eq('id', membershipId)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('تم تحديث الحالة'); },
    onError: (e: any) => toast.error(e?.message || 'فشل التحديث'),
  });

  const removeMember = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ is_active: false })
        .eq('id', membershipId)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('تم إزالة العضو'); },
    onError: (e: any) => toast.error(e?.message || 'فشل الإزالة'),
  });

  const resetPassword = useMutation({
    mutationFn: async ({ userId, password }: { userId: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: { action: 'reset_password', user_id: userId, new_password: password },
      });
      if (error) throw error;
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) throw new Error(result?.message || 'فشل إعادة التعيين');
    },
    onSuccess: () => toast.success('تم إعادة تعيين كلمة المرور'),
    onError: (e: any) => toast.error(e?.message || 'فشل التحديث'),
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
    onError: (e: any) => toast.error(e?.message || 'فشل التحديث'),
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
