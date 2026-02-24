
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOrgId } from './useOrgId';

export const useCustomerService = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['customer-follow-ups', orgId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .select(`*, customer:customers(id, name), assigned_to_profile:profiles!customer_follow_ups_assigned_to_fkey(id, full_name)`)
        .order('scheduled_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const todayFollowUps = followUps.filter(f => { const today = new Date().toISOString().split('T')[0]; return f.scheduled_date === today && f.status === 'pending'; });
  const overdueFollowUps = followUps.filter(f => { const today = new Date().toISOString().split('T')[0]; return f.scheduled_date < today && f.status === 'pending'; });
  const todayTasks = todayFollowUps;

  const createFollowUpMutation = useMutation({
    mutationFn: async (followUpData: any) => {
      const { data, error } = await supabase.from('customer_follow_ups').insert({ ...followUpData, booking_id: followUpData.customer_id, organization_id: orgId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-follow-ups'] }); toast({ title: "تم الحفظ بنجاح", description: "تم إضافة المتابعة بنجاح" }); },
    onError: () => { toast({ title: "خطأ في الحفظ", description: "حدث خطأ أثناء إضافة المتابعة", variant: "destructive" }); },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (followUpId: string) => {
      const { data, error } = await supabase.from('customer_follow_ups').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', followUpId).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-follow-ups'] }); toast({ title: "تم التحديث" }); },
    onError: () => { toast({ title: "خطأ", description: "حدث خطأ أثناء تحديث المتابعة", variant: "destructive" }); },
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase.from('customer_follow_ups').update(data).eq('id', id).select().single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-follow-ups'] }); toast({ title: "تم التحديث" }); },
    onError: () => { toast({ title: "خطأ", variant: "destructive" }); },
  });

  const addCommunicationMutation = useMutation({
    mutationFn: async (communicationData: any) => {
      const { data, error } = await supabase.from('customer_communications').insert({ ...communicationData, organization_id: orgId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-follow-ups'] }); toast({ title: "تم الحفظ", description: "تم إضافة التواصل بنجاح" }); },
    onError: () => { toast({ title: "خطأ", variant: "destructive" }); },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      const { data, error } = await supabase.from('customer_notes').insert({ ...noteData, organization_id: orgId }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['customer-follow-ups'] }); toast({ title: "تم الحفظ", description: "تم إضافة الملاحظة بنجاح" }); },
    onError: () => { toast({ title: "خطأ", variant: "destructive" }); },
  });

  return {
    followUps, todayFollowUps, overdueFollowUps, todayTasks,
    createFollowUp: (data: any) => createFollowUpMutation.mutate(data),
    markFollowUpComplete: (id: string) => markCompleteMutation.mutate(id),
    updateFollowUp: (id: string, data: any) => updateFollowUpMutation.mutate({ id, data }),
    addCommunication: (data: any) => addCommunicationMutation.mutate(data),
    addNote: (data: any) => addNoteMutation.mutate(data),
    isLoading, isCreating: createFollowUpMutation.isPending, isUpdating: markCompleteMutation.isPending || updateFollowUpMutation.isPending,
  };
};
