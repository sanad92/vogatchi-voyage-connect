
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Notification } from '@/types/crm';
import { useOrgId } from './useOrgId';

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ['notifications', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!orgId,
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-unread-count', orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_read', false);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!orgId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      if (!orgId) throw new Error('Missing organization');
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId)
        .eq('organization_id', orgId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] }); },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async (notification: Omit<Notification, 'id' | 'created_at' | 'is_read'>) => {
      const { data, error } = await supabase.from('notifications').insert({ ...notification, organization_id: orgId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['notifications'] }); queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] }); },
  });

  return { notifications, unreadCount, isLoading, markAsRead: markAsReadMutation.mutate, createNotification: createNotificationMutation.mutate, isMarkingAsRead: markAsReadMutation.isPending };
};
