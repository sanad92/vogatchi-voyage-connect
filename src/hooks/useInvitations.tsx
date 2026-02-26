
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { toast } from 'sonner';

export type InvitationRole = 'admin' | 'manager' | 'agent' | 'viewer';

export const useInvitations = () => {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ['invitations', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const sendInvitation = useMutation({
    mutationFn: async ({ email, role }: { email: string; role: InvitationRole }) => {
      if (!orgId || !user?.id) throw new Error('Missing context');

      // Check for existing pending invitation
      const { data: existing } = await supabase
        .from('invitations')
        .select('id')
        .eq('organization_id', orgId)
        .eq('email', email)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) throw new Error('يوجد دعوة معلقة بالفعل لهذا البريد');

      const { data, error } = await supabase
        .from('invitations')
        .insert({
          organization_id: orgId,
          email: email.toLowerCase().trim(),
          role: role as any,
          invited_by: user.id,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', orgId] });
      toast.success('تم إرسال الدعوة بنجاح');
    },
    onError: (error: any) => {
      toast.error(error.message || 'حدث خطأ أثناء إرسال الدعوة');
    },
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', orgId] });
      toast.success('تم إلغاء الدعوة');
    },
  });

  const resendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase
        .from('invitations')
        .update({
          status: 'pending',
          expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
          token: crypto.randomUUID(),
        })
        .eq('id', invitationId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', orgId] });
      toast.success('تم إعادة إرسال الدعوة');
    },
  });

  return {
    invitations,
    isLoading,
    sendInvitation,
    cancelInvitation,
    resendInvitation,
  };
};

export const useAcceptInvitation = () => {
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await supabase.rpc('accept_invitation', { _token: token });
      if (error) throw error;
      return data as any;
    },
  });
};
