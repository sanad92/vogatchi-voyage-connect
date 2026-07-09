import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

export interface ConversationTag {
  id: string;
  name: string;
  color: string;
  description?: string | null;
}

export const useConversationTags = () => {
  const organizationId = useOrgId();
  const qc = useQueryClient();

  const tagsQuery = useQuery({
    queryKey: ['conversation-tags', organizationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('conversation_tags').select('*').order('name');
      if (error) throw error;
      return (data || []) as ConversationTag[];
    },
    enabled: !!organizationId,
  });

  const createTag = useMutation({
    mutationFn: async ({ name, color, description }: { name: string; color: string; description?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await (supabase as any).from('conversation_tags').insert({
        name, color, description,
        organization_id: organizationId,
        created_by: userData.user?.id,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('تم إنشاء الوسم');
      qc.invalidateQueries({ queryKey: ['conversation-tags'] });
    },
    onError: (e: any) => toast.error(e?.message || 'تعذر الإنشاء'),
  });

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('conversation_tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف الوسم');
      qc.invalidateQueries({ queryKey: ['conversation-tags'] });
      qc.invalidateQueries({ queryKey: ['conversation-tag-assignments'] });
    },
    onError: (e: any) => toast.error(e?.message || 'تعذر الحذف'),
  });

  return { tags: tagsQuery.data || [], isLoading: tagsQuery.isLoading, createTag, deleteTag };
};

export const useConversationTagAssignments = (conversationId: string) => {
  const organizationId = useOrgId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['conversation-tag-assignments', conversationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('conversation_tag_assignments')
        .select('*, tag:conversation_tags(*)')
        .eq('conversation_id', conversationId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });

  const addTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('conversation_tag_assignments').insert({
        conversation_id: conversationId,
        tag_id: tagId,
        organization_id: organizationId,
        assigned_by: userData.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversation-tag-assignments', conversationId] }),
    onError: (e: any) => toast.error(e?.message || 'خطأ'),
  });

  const removeTag = useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await (supabase as any)
        .from('conversation_tag_assignments').delete()
        .eq('conversation_id', conversationId).eq('tag_id', tagId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['conversation-tag-assignments', conversationId] }),
    onError: (e: any) => toast.error(e?.message || 'خطأ'),
  });

  return { assignments: query.data || [], isLoading: query.isLoading, addTag, removeTag };
};
