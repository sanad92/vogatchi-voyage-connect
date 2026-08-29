
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOrgId } from './useOrgId';
import { useOptimizedAuth } from './useOptimizedAuth';

export const useCustomerService = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();

  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['customer-follow-ups', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .select(`*, customer:customers(id, name, phone, email), assigned_to_profile:profiles!fk_follow_up_assigned(id, full_name)`)
        .eq('organization_id', orgId!)
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const todayFollowUps = followUps.filter(f => { const today = new Date().toISOString().split('T')[0]; return f.scheduled_date === today && f.status === 'pending'; });
  const overdueFollowUps = followUps.filter(f => { const today = new Date().toISOString().split('T')[0]; return f.scheduled_date < today && f.status === 'pending'; });
  const todayTasks = todayFollowUps;

  const { data: communications = [], isLoading: communicationsLoading } = useQuery({
    queryKey: ['customer-communications', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_communications')
        .select(`*, customer:customers(id, name, phone, email), handled_by_profile:profiles!customer_communications_handled_by_fkey(id, full_name)`)
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as unknown as Record<string, unknown>[];
    },
    enabled: !!orgId,
  });

  const createFollowUpMutation = useMutation({
    mutationFn: async (followUpData: any) => {
      const { data, error } = await supabase.from('customer_follow_ups').insert({
        ...followUpData,
        booking_id: followUpData.booking_id || null,
        assigned_to: followUpData.assigned_to || user?.id || null,
        organization_id: orgId,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-follow-ups'] }); toast({ title: "تم الحفظ بنجاح", description: "تم إضافة المتابعة بنجاح" }); },
    onError: () => { toast({ title: "خطأ في الحفظ", description: "حدث خطأ أثناء إضافة المتابعة", variant: "destructive" }); },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (followUpId: string) => {
      const { data, error } = await supabase.from('customer_follow_ups')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', followUpId).eq('organization_id', orgId!).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-follow-ups'] }); toast({ title: "تم التحديث" }); },
    onError: () => { toast({ title: "خطأ", description: "حدث خطأ أثناء تحديث المتابعة", variant: "destructive" }); },
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase.from('customer_follow_ups')
        .update(data).eq('id', id).eq('organization_id', orgId!).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-follow-ups'] }); toast({ title: "تم التحديث" }); },
    onError: () => { toast({ title: "خطأ", variant: "destructive" }); },
  });

  const addCommunicationMutation = useMutation({
    mutationFn: async (communicationData: any) => {
      const status = communicationData.status || 'completed';
      const { data, error } = await supabase.from('customer_communications').insert({
        ...communicationData,
        organization_id: orgId,
        handled_by: communicationData.handled_by || user?.id || null,
        completed_at: status === 'completed' ? (communicationData.completed_at || new Date().toISOString()) : null,
        status,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-communications'] }); toast({ title: "تم الحفظ", description: "تم إضافة التواصل بنجاح" }); },
    onError: (err: any) => { toast({ title: "خطأ في إضافة سجل التواصل", description: err?.message || "تحقق من اختيار العميل وحالة الاشتراك", variant: "destructive" }); },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      const { data, error } = await supabase.from('customer_notes').insert({ ...noteData, created_by: noteData.created_by || user?.id || null, organization_id: orgId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-follow-ups'] }); toast({ title: "تم الحفظ", description: "تم إضافة الملاحظة بنجاح" }); },
    onError: () => { toast({ title: "خطأ", variant: "destructive" }); },
  });

  return {
    followUps, todayFollowUps, overdueFollowUps, todayTasks, communications,
    createFollowUp: (data: any) => createFollowUpMutation.mutateAsync(data),
    markFollowUpComplete: (id: string) => markCompleteMutation.mutateAsync(id),
    updateFollowUp: (id: string, data: any) => updateFollowUpMutation.mutateAsync({ id, data }),
    addCommunication: (data: any) => addCommunicationMutation.mutateAsync(data),
    addNote: (data: any) => addNoteMutation.mutateAsync(data),
    isLoading: isLoading || communicationsLoading,
    isCreating: createFollowUpMutation.isPending || addCommunicationMutation.isPending,
    isUpdating: markCompleteMutation.isPending || updateFollowUpMutation.isPending,
  };
};
