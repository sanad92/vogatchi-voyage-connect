import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';
import { useEffect } from 'react';

export const useConversationNotes = (conversationId: string) => {
  const organizationId = useOrgId();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['conversation-internal-notes', conversationId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('conversation_internal_notes')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const authorIds = Array.from(new Set((data || []).map((n: any) => n.author_id).filter(Boolean)));
      let authorsMap: Record<string, any> = {};
      if (authorIds.length) {
        const { data: profiles } = await (supabase as any)
          .from('profiles').select('id, full_name, email').in('id', authorIds);
        (profiles || []).forEach((p: any) => { authorsMap[p.id] = p; });
      }
      return (data || []).map((n: any) => ({ ...n, author: authorsMap[n.author_id] || null }));
    },
    enabled: !!conversationId,
  });

  // Realtime
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase.channel(`notes-${conversationId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'conversation_internal_notes', filter: `conversation_id=eq.${conversationId}` },
        () => qc.invalidateQueries({ queryKey: ['conversation-internal-notes', conversationId] })
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, qc]);

  const addNote = useMutation({
    mutationFn: async ({ content, mentions }: { content: string; mentions?: string[] }) => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('غير مصرح');
      const { error } = await (supabase as any).from('conversation_internal_notes').insert({
        conversation_id: conversationId,
        organization_id: organizationId,
        author_id: userData.user.id,
        content,
        mentions: mentions || [],
      });
      if (error) throw error;
      // update preview
      await (supabase as any).from('whatsapp_conversations')
        .update({ last_note_preview: content.slice(0, 120) })
        .eq('id', conversationId);
    },
    onSuccess: () => {
      toast.success('تمت إضافة الملاحظة');
      qc.invalidateQueries({ queryKey: ['conversation-internal-notes', conversationId] });
    },
    onError: (e: any) => toast.error(e?.message || 'خطأ'),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('conversation_internal_notes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('تم حذف الملاحظة');
      qc.invalidateQueries({ queryKey: ['conversation-internal-notes', conversationId] });
    },
    onError: (e: any) => toast.error(e?.message || 'خطأ'),
  });

  return { notes: query.data || [], isLoading: query.isLoading, addNote, deleteNote };
};
