
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { CustomerFollowUp, CustomerCommunication, CustomerNote } from '@/types/customerService';

export const useCustomerService = () => {
  const queryClient = useQueryClient();

  // جلب مهام المتابعة
  const { data: followUps, isLoading: followUpsLoading } = useQuery({
    queryKey: ['customer-follow-ups'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .select(`
          *,
          customers(name, phone, email),
          bookings(booking_reference, check_in_date),
          assigned_to_profile:profiles!customer_follow_ups_assigned_to_fkey(full_name)
        `)
        .order('scheduled_date', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // جلب المهام المطلوبة لليوم الحالي
  const { data: todayTasks } = useQuery({
    queryKey: ['today-follow-ups'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .select(`
          *,
          customers(name, phone, email),
          bookings(booking_reference, check_in_date)
        `)
        .eq('scheduled_date', today)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  // تحديث حالة مهمة المتابعة
  const updateFollowUpMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CustomerFollowUp> }) => {
      const { data, error } = await supabase
        .from('customer_follow_ups')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-follow-ups'] });
      queryClient.invalidateQueries({ queryKey: ['today-follow-ups'] });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث مهمة المتابعة بنجاح",
      });
    },
    onError: (error) => {
      toast({
        title: "خطأ في التحديث",
        description: "حدث خطأ أثناء تحديث مهمة المتابعة",
        variant: "destructive",
      });
    },
  });

  // إضافة تواصل جديد
  const addCommunicationMutation = useMutation({
    mutationFn: async (communication: Omit<CustomerCommunication, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('customer_communications')
        .insert(communication)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-communications'] });
      toast({
        title: "تم إضافة التواصل",
        description: "تم تسجيل التواصل مع العميل بنجاح",
      });
    },
  });

  // إضافة ملاحظة جديدة
  const addNoteMutation = useMutation({
    mutationFn: async (note: Omit<CustomerNote, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('customer_notes')
        .insert(note)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes'] });
      toast({
        title: "تم إضافة الملاحظة",
        description: "تم إضافة ملاحظة العميل بنجاح",
      });
    },
  });

  // دالة مساعدة لتحديث المتابعة بطريقة مبسطة
  const updateFollowUp = (id: string, updates: Partial<CustomerFollowUp>) => {
    updateFollowUpMutation.mutate({ id, updates });
  };

  // دالة مساعدة لإضافة التواصل بطريقة مبسطة
  const addCommunication = (data: Omit<CustomerCommunication, 'id' | 'created_at'>) => {
    addCommunicationMutation.mutate(data);
  };

  // دالة مساعدة لإضافة الملاحظة بطريقة مبسطة
  const addNote = (data: Omit<CustomerNote, 'id' | 'created_at' | 'updated_at'>) => {
    addNoteMutation.mutate(data);
  };

  return {
    followUps,
    followUpsLoading,
    todayTasks,
    updateFollowUp,
    addCommunication,
    addNote,
    isUpdating: updateFollowUpMutation.isPending,
  };
};
