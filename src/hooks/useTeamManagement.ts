import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';
import type { OrgRole } from '@/lib/accessControl';

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
    mutationFn: async (_input: NewTeamMemberInput) => {
      throw new Error('إضافة الأعضاء متاحة بالدعوة فقط لحماية كلمة المرور وهوية الموظف');
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
    onError: (e: any) => toast.error(e?.message || 'حدث خطأ'),
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
    onError: (e: any) => toast.error(e?.message || 'حدث خطأ'),
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
    onError: (e: any) => toast.error(e?.message || 'فشل التحديث'),
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
    onError: (e: any) => toast.error(e?.message || 'فشل التحديث'),
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
    onError: (e: any) => toast.error(e?.message || 'فشل الإزالة'),
  });

  const resetPassword = useMutation({
    mutationFn: async (_input: { userId: string; password: string }) => {
      throw new Error('إعادة كلمة المرور تتم من رابط «نسيت كلمة المرور» بواسطة صاحب الحساب');
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
