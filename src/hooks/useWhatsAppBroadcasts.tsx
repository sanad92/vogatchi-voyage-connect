import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface WhatsAppBroadcast {
  id: string;
  organization_id: string;
  name: string;
  description?: string | null;
  template_id?: string | null;
  message_body?: string | null;
  audience_type: 'all' | 'segment' | 'tag' | 'custom' | 'manual';
  audience_filter: any;
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed' | 'cancelled';
  scheduled_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export interface BroadcastRecipient {
  id: string;
  broadcast_id: string;
  phone_number: string;
  customer_name?: string | null;
  customer_id?: string | null;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed' | 'skipped';
  error_message?: string | null;
  personalization?: any;
}

export function useWhatsAppBroadcasts() {
  const orgId = useOrgId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['whatsapp-broadcasts', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('whatsapp_broadcasts')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as WhatsAppBroadcast[];
    },
  });

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase.channel(`wa-broadcasts-${orgId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'whatsapp_broadcasts',
        filter: `organization_id=eq.${orgId}`,
      }, () => qc.invalidateQueries({ queryKey: ['whatsapp-broadcasts', orgId] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, qc]);

  const createBroadcast = useMutation({
    mutationFn: async (payload: {
      name: string; description?: string; message_body: string;
      template_id?: string | null; audience_type: WhatsAppBroadcast['audience_type'];
      audience_filter?: any; scheduled_at?: string | null;
      recipients: Array<{ phone_number: string; customer_id?: string | null; customer_name?: string | null; personalization?: any }>;
    }) => {
      if (!orgId) throw new Error('org required');
      const { data: b, error } = await (supabase as any)
        .from('whatsapp_broadcasts')
        .insert({
          organization_id: orgId,
          name: payload.name,
          description: payload.description,
          message_body: payload.message_body,
          template_id: payload.template_id,
          audience_type: payload.audience_type,
          audience_filter: payload.audience_filter || {},
          scheduled_at: payload.scheduled_at,
          status: payload.scheduled_at ? 'scheduled' : 'draft',
          total_recipients: payload.recipients.length,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select().single();
      if (error) throw error;

      if (payload.recipients.length) {
        const rows = payload.recipients.map((r) => ({
          broadcast_id: b.id,
          organization_id: orgId,
          phone_number: r.phone_number,
          customer_id: r.customer_id || null,
          customer_name: r.customer_name || null,
          personalization: r.personalization || {},
        }));
        const { error: rErr } = await (supabase as any)
          .from('whatsapp_broadcast_recipients').insert(rows);
        if (rErr) throw rErr;
      }
      return b as WhatsAppBroadcast;
    },
    onSuccess: () => {
      toast.success('تم إنشاء الحملة');
      qc.invalidateQueries({ queryKey: ['whatsapp-broadcasts', orgId] });
    },
    onError: (e: any) => toast.error(e.message || 'فشل الإنشاء'),
  });

  const sendBroadcast = useMutation({
    mutationFn: async (broadcastId: string) => {
      const { data, error } = await supabase.functions.invoke('whatsapp-send-broadcast', {
        body: { broadcastId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('بدء إرسال الحملة');
      qc.invalidateQueries({ queryKey: ['whatsapp-broadcasts', orgId] });
    },
    onError: async (e: any) => {
      let msg = e?.message || 'فشل الإرسال';
      try {
        const ctx = e?.context;
        if (ctx && typeof ctx.json === 'function') {
          const j = await ctx.json();
          if (j?.error) msg = j.error;
        } else if (ctx && typeof ctx.text === 'function') {
          const t = await ctx.text();
          try { msg = JSON.parse(t)?.error || t || msg; } catch { msg = t || msg; }
        }
      } catch {}
      toast.error(msg);
    },
  });

  const cancelBroadcast = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('whatsapp_broadcasts')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم الإلغاء');
      qc.invalidateQueries({ queryKey: ['whatsapp-broadcasts', orgId] });
    },
  });

  const deleteBroadcast = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('whatsapp_broadcasts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم الحذف');
      qc.invalidateQueries({ queryKey: ['whatsapp-broadcasts', orgId] });
    },
  });

  return {
    broadcasts: query.data || [],
    isLoading: query.isLoading,
    createBroadcast: createBroadcast.mutateAsync,
    sendBroadcast: sendBroadcast.mutateAsync,
    cancelBroadcast: cancelBroadcast.mutate,
    deleteBroadcast: deleteBroadcast.mutate,
    isCreating: createBroadcast.isPending,
    isSending: sendBroadcast.isPending,
  };
}

export function useBroadcastRecipients(broadcastId?: string) {
  return useQuery({
    queryKey: ['broadcast-recipients', broadcastId],
    enabled: !!broadcastId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('whatsapp_broadcast_recipients')
        .select('*')
        .eq('broadcast_id', broadcastId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as BroadcastRecipient[];
    },
  });
}
