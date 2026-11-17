import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgId } from './useOrgId';
import { toast } from 'sonner';
import { playAlertSound } from '@/lib/soundAlerts';

export const useNotifications = (live = false) => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const userId = user?.id;
  const key = ['notifications', orgId, userId];
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const list = useQuery({
    queryKey: [...key, 'list'],
    queryFn: async () => {
      if (!orgId || !userId) return [];
      const { data, error } = await supabase.from('notifications').select('*')
        .eq('organization_id', orgId).eq('user_id', userId)
        .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!userId,
    refetchInterval: live ? 60_000 : false,
  });

  const count = useQuery({
    queryKey: [...key, 'unread'],
    queryFn: async () => {
      if (!orgId || !userId) return 0;
      const { count, error } = await supabase.from('notifications').select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId).eq('user_id', userId).or('is_read.is.null,is_read.eq.false');
      if (error) throw error;
      return count ?? 0;
    },
    enabled: !!orgId && !!userId,
    refetchInterval: live ? 60_000 : false,
  });

  useEffect(() => {
    if (!live || !orgId || !userId) return;
    const changes = { schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` };
    const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['notifications', orgId, userId] });
    const channel = supabase.channel(`notifications:${orgId}:${userId}`)
      .on('postgres_changes', { ...changes, event: 'INSERT' }, ({ new: row }) => {
        if (row.organization_id !== orgId) return;
        playAlertSound('notification');
        invalidate();
      })
      .on('postgres_changes', { ...changes, event: 'UPDATE' }, ({ new: row }) => {
        if (row.organization_id === orgId) invalidate();
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') invalidate();
      });
    return () => { void supabase.removeChannel(channel); };
  }, [live, orgId, userId, queryClient]);

  const mark = useMutation({
    mutationFn: async (id: string | null) => {
      if (!orgId || !userId) throw new Error('No active notification context');
      let request = supabase.from('notifications').update({ is_read: true })
        .eq('organization_id', orgId).eq('user_id', userId).or('is_read.is.null,is_read.eq.false');
      if (id) request = request.eq('id', id);
      const { error } = await request;
      if (error) throw error;
    },
    onSuccess: () => { void refresh(); },
    onError: () => toast.error('تعذّر تحديث حالة قراءة الإشعار.'),
  });

  return {
    notifications: list.data ?? [],
    unreadCount: count.data ?? 0,
    isLoading: list.isLoading,
    isError: list.isError,
    refresh,
    markAsRead: (id: string) => mark.mutate(id),
    markAsReadAsync: (id: string) => mark.mutateAsync(id),
    markAllAsRead: () => mark.mutate(null),
    isMarkingAsRead: mark.isPending,
  };
};
