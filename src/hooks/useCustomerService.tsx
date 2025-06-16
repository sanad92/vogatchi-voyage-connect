
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useCustomerService = () => {
  const queryClient = useQueryClient();

  // Fetch all follow-ups
  const { data: followUps = [], isLoading } = useQuery({
    queryKey: ['customer-follow-ups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .select(`
          *,
          customer:customers(id, name),
          assigned_to_profile:profiles!customer_follow_ups_assigned_to_fkey(id, full_name)
        `)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Get today's follow-ups
  const todayFollowUps = followUps.filter(followUp => {
    const today = new Date().toISOString().split('T')[0];
    return followUp.scheduled_date === today && followUp.status === 'pending';
  });

  // Get overdue follow-ups
  const overdueFollowUps = followUps.filter(followUp => {
    const today = new Date().toISOString().split('T')[0];
    return followUp.scheduled_date < today && followUp.status === 'pending';
  });

  // Get today's tasks - alias for todayFollowUps
  const todayTasks = todayFollowUps;

  // Create follow-up mutation
  const createFollowUpMutation = useMutation({
    mutationFn: async (followUpData: any) => {
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .insert({
          ...followUpData,
          booking_id: followUpData.customer_id // Use customer_id as booking_id for now
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-follow-ups'] });
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم إضافة المتابعة بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error creating follow-up:', error);
      toast({
        title: "خطأ في الحفظ",
        description: "حدث خطأ أثناء إضافة المتابعة",
        variant: "destructive",
      });
    },
  });

  // Mark follow-up complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async (followUpId: string) => {
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', followUpId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-follow-ups'] });
      toast({
        title: "تم التحديث",
        description: "تم تحديث حالة المتابعة",
      });
    },
    onError: (error) => {
      console.error('Error updating follow-up:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحديث المتابعة",
        variant: "destructive",
      });
    },
  });

  const createFollowUp = (data: any) => {
    createFollowUpMutation.mutate(data);
  };

  const markFollowUpComplete = (id: string) => {
    markCompleteMutation.mutate(id);
  };

  return {
    followUps,
    todayFollowUps,
    overdueFollowUps,
    todayTasks,
    createFollowUp,
    markFollowUpComplete,
    isLoading,
    isCreating: createFollowUpMutation.isPending,
    isUpdating: markCompleteMutation.isPending,
  };
};
