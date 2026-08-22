
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { toast } from 'sonner';

export type InvitationRole = 'admin' | 'manager' | 'agent' | 'viewer';

export interface AcceptInvitationResult {
  success: boolean;
  error?: string;
  message?: string;
  organization_id?: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
};

export const useInvitations = () => {
  const orgId = useOrgId();
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
      if (!orgId) throw new Error('لا توجد مؤسسة محددة');
      const { data, error } = await supabase.rpc('create_organization_invitation', {
        _organization_id: orgId,
        _email: email.toLowerCase().trim(),
        _role: role,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', orgId] });
      toast.success('تم إرسال الدعوة بنجاح');
    },
    onError: (error: unknown) => {
      toast.error(getErrorMessage(error, 'حدث خطأ أثناء إرسال الدعوة'));
    },
  });

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.rpc('cancel_organization_invitation', {
        _invitation_id: invitationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', orgId] });
      toast.success('تم إلغاء الدعوة');
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'تعذر إلغاء الدعوة')),
  });

  const resendInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.rpc('resend_organization_invitation', {
        _invitation_id: invitationId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations', orgId] });
      toast.success('تم إعادة إرسال الدعوة');
    },
    onError: (error: unknown) => toast.error(getErrorMessage(error, 'تعذر إعادة إرسال الدعوة')),
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
      return data as unknown as AcceptInvitationResult;
    },
  });
};
