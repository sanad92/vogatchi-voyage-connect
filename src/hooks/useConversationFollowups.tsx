import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from './useOrgId';
import { useOptimizedAuth } from './useOptimizedAuth';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface WhatsAppFollowup {
  id: string;
  organization_id: string;
  conversation_id: string;
  remind_at: string;
  note: string | null;
  status: 'pending' | 'done' | 'cancelled' | 'snoozed';
  assigned_to: string | null;
  created_by: string;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  updated_at: string;
}

export const useConversationFollowups = (conversationId?: string) => {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth() as any;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['whatsapp-followups', orgId, conversationId],
    queryFn: async (): Promise<WhatsAppFollowup[]> => {
      if (!orgId || !conversationId) return [];
      const { data, error } = await (supabase
        .from('whatsapp_followups' as any)
        .select('*')
        .eq('conversation_id', conversationId)
        .order('remind_at', { ascending: true }) as any);
      if (error) throw error;
      return (data as WhatsAppFollowup[]) || [];
    },
    enabled: !!orgId && !!conversationId,
  });

  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`wa-followups-${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_followups', filter: `conversation_id=eq.${conversationId}` },
        () => qc.invalidateQueries({ queryKey: ['whatsapp-followups', orgId, conversationId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, orgId, qc]);

  const create = useMutation({
    mutationFn: async (payload: { remind_at: string; note?: string; assigned_to?: string | null }) => {
      if (!orgId || !user?.id || !conversationId) throw new Error('السياق ناقص');
      const { data, error } = await (supabase.from('whatsapp_followups' as any).insert({
        organization_id: orgId,
        conversation_id: conversationId,
        remind_at: payload.remind_at,
        note: payload.note || null,
        assigned_to: payload.assigned_to || null,
        created_by: user.id,
      }).select().single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-followups'] });
      toast.success('تم إنشاء التذكير');
    },
    onError: (e: any) => toast.error(e?.message || 'فشل إنشاء التذكير'),
  });

  const complete = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('whatsapp_followups' as any).update({
        status: 'done',
        completed_at: new Date().toISOString(),
        completed_by: user?.id,
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-followups'] });
      toast.success('تم إنجاز التذكير');
    },
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from('whatsapp_followups' as any).update({
        status: 'cancelled',
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['whatsapp-followups'] }),
  });

  const snooze = useMutation({
    mutationFn: async ({ id, minutes }: { id: string; minutes: number }) => {
      const newTime = new Date(Date.now() + minutes * 60_000).toISOString();
      const { error } = await (supabase.from('whatsapp_followups' as any).update({
        remind_at: newTime,
        status: 'pending',
      }).eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['whatsapp-followups'] });
      toast.success('تم تأجيل التذكير');
    },
  });

  return {
    followups: query.data || [],
    isLoading: query.isLoading,
    create: create.mutate,
    complete: complete.mutate,
    cancel: cancel.mutate,
    snooze: snooze.mutate,
    isCreating: create.isPending,
  };
};

export const usePendingFollowupsForOrg = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['whatsapp-followups-pending', orgId],
    queryFn: async (): Promise<WhatsAppFollowup[]> => {
      if (!orgId) return [];
      const { data, error } = await (supabase
        .from('whatsapp_followups' as any)
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .order('remind_at', { ascending: true })
        .limit(100) as any);
      if (error) throw error;
      return (data as WhatsAppFollowup[]) || [];
    },
    enabled: !!orgId,
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel(`wa-followups-org-${orgId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_followups', filter: `organization_id=eq.${orgId}` },
        () => qc.invalidateQueries({ queryKey: ['whatsapp-followups-pending', orgId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, qc]);

  return {
    pending: query.data || [],
    dueNow: (query.data || []).filter((f) => new Date(f.remind_at) <= new Date()),
    isLoading: query.isLoading,
  };
};
