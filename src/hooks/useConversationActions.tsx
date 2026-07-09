import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

type Priority = 'low' | 'normal' | 'high' | 'urgent';
type Status = 'open' | 'pending' | 'active' | 'resolved' | 'closed' | 'transferred' | 'archived';

const logHistory = async (params: {
  conversation_id: string;
  organization_id: string;
  action: string;
  from_user_id?: string | null;
  to_user_id?: string | null;
  reason?: string | null;
  metadata?: Record<string, any>;
}) => {
  const { data: userData } = await supabase.auth.getUser();
  await (supabase as any).from('conversation_assignments_history').insert({
    ...params,
    performed_by: userData.user?.id,
  });
};

export const useConversationActions = (conversationId: string) => {
  const qc = useQueryClient();
  const organizationId = useOrgId();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['whatsapp-conversation-detail', conversationId] });
    qc.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    qc.invalidateQueries({ queryKey: ['conversation-history', conversationId] });
  };

  const assign = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string | null; reason?: string }) => {
      const { data: current } = await (supabase as any)
        .from('whatsapp_conversations')
        .select('assigned_to, organization_id')
        .eq('id', conversationId)
        .maybeSingle();
      const orgId = current?.organization_id || organizationId!;
      const { error } = await (supabase as any)
        .from('whatsapp_conversations')
        .update({ assigned_to: userId, auto_assigned: false })
        .eq('id', conversationId);
      if (error) throw error;
      await logHistory({
        conversation_id: conversationId,
        organization_id: orgId,
        action: userId ? (current?.assigned_to ? 'reassigned' : 'assigned') : 'unassigned',
        from_user_id: current?.assigned_to || null,
        to_user_id: userId,
        reason: reason || null,
      });
    },
    onSuccess: () => { toast.success('تم تحديث التخصيص'); invalidate(); },
    onError: (e: any) => toast.error(e?.message || 'تعذر التخصيص'),
  });

  const setStatus = useMutation({
    mutationFn: async (status: Status) => {
      const patch: any = { status };
      if (status === 'resolved') patch.resolved_at = new Date().toISOString();
      if (status === 'closed') patch.closed_at = new Date().toISOString();
      const { error } = await (supabase as any)
        .from('whatsapp_conversations').update(patch).eq('id', conversationId);
      if (error) throw error;
      await logHistory({
        conversation_id: conversationId,
        organization_id: organizationId!,
        action: status === 'resolved' ? 'resolved' : status === 'closed' ? 'closed' : status === 'archived' ? 'archived' : 'status_changed',
        metadata: { status },
      });
    },
    onSuccess: () => { toast.success('تم تحديث الحالة'); invalidate(); },
    onError: (e: any) => toast.error(e?.message || 'خطأ'),
  });

  const setPriority = useMutation({
    mutationFn: async (priority: Priority) => {
      const { error } = await (supabase as any)
        .from('whatsapp_conversations').update({ priority }).eq('id', conversationId);
      if (error) throw error;
      await logHistory({
        conversation_id: conversationId,
        organization_id: organizationId!,
        action: 'priority_changed',
        metadata: { priority },
      });
    },
    onSuccess: () => { toast.success('تم تحديث الأولوية'); invalidate(); },
    onError: (e: any) => toast.error(e?.message || 'خطأ'),
  });

  const toggleStar = useMutation({
    mutationFn: async (starred: boolean) => {
      const { error } = await (supabase as any)
        .from('whatsapp_conversations').update({ is_starred: starred }).eq('id', conversationId);
      if (error) throw error;
      await logHistory({
        conversation_id: conversationId,
        organization_id: organizationId!,
        action: 'starred',
        metadata: { starred },
      });
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e?.message || 'خطأ'),
  });

  return { assign, setStatus, setPriority, toggleStar };
};

export const useConversationHistory = (conversationId: string) => {
  return useQuery({
    queryKey: ['conversation-history', conversationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('conversation_assignments_history')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    enabled: !!conversationId,
  });
};
