import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { toast } from 'sonner';

export interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  joined_at: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
  } | null;
}

export const useOrgMembers = () => {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['org-members', orgId],
    queryFn: async () => {
      if (!orgId) return [];

      const { data: memberships, error: memError } = await supabase
        .from('organization_members')
        .select('id, user_id, role, is_active, joined_at')
        .eq('organization_id', orgId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true });

      if (memError) throw memError;
      if (!memberships?.length) return [];

      const userIds = memberships.map(m => m.user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return memberships.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id) || null,
      })) as OrgMember[];
    },
    enabled: !!orgId,
  });

  const updateRole = useMutation({
    mutationFn: async ({ memberId, newRole }: { memberId: string; newRole: string }) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ role: newRole as any })
        .eq('id', memberId)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', orgId] });
      toast.success('تم تحديث الدور بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث الدور');
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('organization_members')
        .update({ is_active: false })
        .eq('id', memberId)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members', orgId] });
      toast.success('تم إزالة العضو بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء إزالة العضو');
    },
  });

  const currentUserMembership = members.find(m => m.user_id === user?.id);

  return {
    members,
    isLoading,
    updateRole,
    removeMember,
    currentUserRole: currentUserMembership?.role || null,
    isOwner: currentUserMembership?.role === 'owner',
  };
};
