import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';
import { usePermissionCheck } from '@/hooks/usePermissionCheck';

export interface Branch {
  id: string;
  organization_id: string;
  name: string;
  code: string | null;
  address: string | null;
  phone: string | null;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
}
export interface Department {
  id: string;
  organization_id: string;
  branch_id: string | null;
  name: string;
  code: string | null;
  manager_id: string | null;
  is_active: boolean;
  created_at: string;
}

export const useBranches = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['branches', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from('branches').select('*').eq('organization_id', orgId).order('name');
      if (error) throw error;
      return (data ?? []) as Branch[];
    },
    enabled: !!orgId,
  });
};

export const useDepartments = () => {
  const orgId = useOrgId();
  return useQuery({
    queryKey: ['departments', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase.from('departments').select('*').eq('organization_id', orgId).order('name');
      if (error) throw error;
      return (data ?? []) as Department[];
    },
    enabled: !!orgId,
  });
};

export const useBranchMutations = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { hasPermission } = usePermissionCheck();
  const save = useMutation({
    mutationFn: async (b: Partial<Branch> & { id?: string }) => {
      if (!orgId) throw new Error('no org');
      if (!hasPermission('admin_settings')) throw new Error('لا تملك صلاحية إدارة الفروع');
      if (b.organization_id && b.organization_id !== orgId) throw new Error('تغيّرت الشركة؛ أعد فتح الفرع');
      if (!b.name?.trim()) throw new Error('أدخل اسم الفرع');
      const row = { name: b.name.trim(), code: b.code?.trim() || null, address: b.address?.trim() || null, phone: b.phone?.trim() || null, is_active: b.is_active ?? true };
      const { error } = b.id
        ? await supabase.from('branches').update(row).eq('id', b.id).eq('organization_id', orgId).select('id').single()
        : await supabase.from('branches').insert({ ...row, organization_id: orgId }).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); toast.success('تم الحفظ'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!orgId || !hasPermission('admin_settings')) throw new Error('لا تملك صلاحية تعديل إعدادات الشركة');
      const { error } = await supabase.from('branches').delete().eq('id', id).eq('organization_id', orgId).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); toast.success('تم الحذف'); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { save, remove };
};

export const useDepartmentMutations = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { hasPermission } = usePermissionCheck();
  const save = useMutation({
    mutationFn: async (d: Partial<Department> & { id?: string }) => {
      if (!orgId) throw new Error('no org');
      if (!hasPermission('admin_settings')) throw new Error('لا تملك صلاحية إدارة الأقسام');
      if (d.organization_id && d.organization_id !== orgId) throw new Error('تغيّرت الشركة؛ أعد فتح القسم');
      if (!d.name?.trim()) throw new Error('أدخل اسم القسم');
      if (d.branch_id) {
        const { data: branch, error: branchError } = await supabase.from('branches').select('id').eq('id', d.branch_id).eq('organization_id', orgId).maybeSingle();
        if (branchError) throw branchError;
        if (!branch) throw new Error('الفرع غير متاح في الشركة الحالية');
      }
      const row = { name: d.name.trim(), code: d.code?.trim() || null, branch_id: d.branch_id ?? null, is_active: d.is_active ?? true };
      const { error } = d.id
        ? await supabase.from('departments').update(row).eq('id', d.id).eq('organization_id', orgId).select('id').single()
        : await supabase.from('departments').insert({ ...row, organization_id: orgId }).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('تم الحفظ'); },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!orgId || !hasPermission('admin_settings')) throw new Error('لا تملك صلاحية تعديل إعدادات الشركة');
      const { error } = await supabase.from('departments').delete().eq('id', id).eq('organization_id', orgId).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('تم الحذف'); },
    onError: (e: Error) => toast.error(e.message),
  });
  return { save, remove };
};
