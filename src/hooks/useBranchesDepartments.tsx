import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

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
      const { data, error } = await (supabase as any).from('branches').select('*').eq('organization_id', orgId).order('name');
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
      const { data, error } = await (supabase as any).from('departments').select('*').eq('organization_id', orgId).order('name');
      if (error) throw error;
      return (data ?? []) as Department[];
    },
    enabled: !!orgId,
  });
};

export const useBranchMutations = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async (b: Partial<Branch> & { id?: string }) => {
      if (!orgId) throw new Error('no org');
      const row = { ...b, organization_id: orgId };
      const { error } = b.id
        ? await (supabase as any).from('branches').update(row).eq('id', b.id)
        : await (supabase as any).from('branches').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); toast.success('تم الحفظ'); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('branches').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['branches'] }); toast.success('تم الحذف'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { save, remove };
};

export const useDepartmentMutations = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: async (d: Partial<Department> & { id?: string }) => {
      if (!orgId) throw new Error('no org');
      const row = { ...d, organization_id: orgId };
      const { error } = d.id
        ? await (supabase as any).from('departments').update(row).eq('id', d.id)
        : await (supabase as any).from('departments').insert(row);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('تم الحفظ'); },
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('departments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('تم الحذف'); },
    onError: (e: any) => toast.error(e.message),
  });
  return { save, remove };
};
