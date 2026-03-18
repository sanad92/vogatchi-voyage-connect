import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useOrgId } from './useOrgId';

export const useCustomerService = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();

  const followUpsQueryKey = ['customer-follow-ups', orgId];

  const { data: followUps = [], isLoading } = useQuery({
    queryKey: followUpsQueryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .select('*, customer:customers(id, name), assigned_to_profile:profiles!fk_follow_up_assigned(id, full_name)')
        .eq('organization_id', orgId)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!orgId,
  });

  const today = new Date().toISOString().split('T')[0];
  const todayFollowUps = followUps.filter((followUp) => followUp.scheduled_date === today && followUp.status === 'pending');
  const overdueFollowUps = followUps.filter((followUp) => followUp.scheduled_date < today && followUp.status === 'pending');
  const todayTasks = todayFollowUps;

  const createFollowUpMutation = useMutation({
    mutationFn: async (followUpData: any) => {
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .insert({
          ...followUpData,
          booking_id: followUpData.booking_id ?? null,
          organization_id: orgId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followUpsQueryKey });
      toast({
        title: '\u062a\u0645 \u0627\u0644\u062d\u0641\u0638 \u0628\u0646\u062c\u0627\u062d',
        description: '\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629 \u0628\u0646\u062c\u0627\u062d',
      });
    },
    onError: () => {
      toast({
        title: '\u062e\u0637\u0623 \u0641\u064a \u0627\u0644\u062d\u0641\u0638',
        description: '\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629',
        variant: 'destructive',
      });
    },
  });

  const markCompleteMutation = useMutation({
    mutationFn: async (followUpId: string) => {
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', followUpId)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followUpsQueryKey });
      toast({ title: '\u062a\u0645 \u0627\u0644\u062a\u062d\u062f\u064a\u062b' });
    },
    onError: () => {
      toast({
        title: '\u062e\u0637\u0623',
        description: '\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629',
        variant: 'destructive',
      });
    },
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const { data: result, error } = await supabase
        .from('customer_follow_ups')
        .update(data)
        .eq('id', id)
        .eq('organization_id', orgId)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followUpsQueryKey });
      toast({ title: '\u062a\u0645 \u0627\u0644\u062a\u062d\u062f\u064a\u062b' });
    },
    onError: () => {
      toast({ title: '\u062e\u0637\u0623', variant: 'destructive' });
    },
  });

  const addCommunicationMutation = useMutation({
    mutationFn: async (communicationData: any) => {
      const { data, error } = await supabase
        .from('customer_communications')
        .insert({ ...communicationData, organization_id: orgId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followUpsQueryKey });
      toast({
        title: '\u062a\u0645 \u0627\u0644\u062d\u0641\u0638',
        description: '\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u062a\u0648\u0627\u0635\u0644 \u0628\u0646\u062c\u0627\u062d',
      });
    },
    onError: () => {
      toast({ title: '\u062e\u0637\u0623', variant: 'destructive' });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteData: any) => {
      const { data, error } = await supabase
        .from('customer_notes')
        .insert({ ...noteData, organization_id: orgId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followUpsQueryKey });
      toast({
        title: '\u062a\u0645 \u0627\u0644\u062d\u0641\u0638',
        description: '\u062a\u0645 \u0625\u0636\u0627\u0641\u0629 \u0627\u0644\u0645\u0644\u0627\u062d\u0638\u0629 \u0628\u0646\u062c\u0627\u062d',
      });
    },
    onError: () => {
      toast({ title: '\u062e\u0637\u0623', variant: 'destructive' });
    },
  });

  return {
    followUps,
    todayFollowUps,
    overdueFollowUps,
    todayTasks,
    createFollowUp: (data: any) => createFollowUpMutation.mutate(data),
    markFollowUpComplete: (id: string) => markCompleteMutation.mutate(id),
    updateFollowUp: (id: string, data: any) => updateFollowUpMutation.mutate({ id, data }),
    addCommunication: (data: any) => addCommunicationMutation.mutate(data),
    addNote: (data: any) => addNoteMutation.mutate(data),
    isLoading,
    isCreating: createFollowUpMutation.isPending,
    isUpdating: markCompleteMutation.isPending || updateFollowUpMutation.isPending,
  };
};
