
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RentPayment } from '@/types/expenses';

export const useRentPayments = () => {
  const queryClient = useQueryClient();

  // جلب مدفوعات الإيجار
  const { data: rentPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['rent-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select(`
          *,
          contract:rent_contracts(*)
        `)
        .order('payment_month', { ascending: false });

      if (error) throw error;
      return data as (RentPayment & { contract?: any })[];
    },
  });

  // إضافة مدفوعة إيجار
  const { mutateAsync: addRentPayment, isPending: isAddingPayment } = useMutation({
    mutationFn: async (payment: Omit<RentPayment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('rent_payments')
        .insert({
          ...payment,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      toast.success('تم إضافة مدفوعة الإيجار بنجاح');
    },
    onError: (error) => {
      console.error('Error adding rent payment:', error);
      toast.error('حدث خطأ في إضافة مدفوعة الإيجار');
    },
  });

  // تحديث حالة مدفوعة إيجار
  const { mutateAsync: updatePaymentStatus, isPending: isUpdatingPayment } = useMutation({
    mutationFn: async ({ id, status, payment_date }: { 
      id: string; 
      status: 'pending' | 'paid' | 'overdue' | 'cancelled';
      payment_date?: string;
    }) => {
      const { data, error } = await supabase
        .from('rent_payments')
        .update({ status, payment_date })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      toast.success('تم تحديث حالة المدفوعة بنجاح');
    },
    onError: (error) => {
      console.error('Error updating payment status:', error);
      toast.error('حدث خطأ في تحديث حالة المدفوعة');
    },
  });

  // إنشاء مدفوعات شهرية تلقائية لعقد معين
  const { mutateAsync: generateMonthlyPayments, isPending: isGeneratingPayments } = useMutation({
    mutationFn: async ({ contractId, months }: { contractId: string; months: number }) => {
      const contract = await supabase
        .from('rent_contracts')
        .select('*')
        .eq('id', contractId)
        .single();

      if (contract.error) throw contract.error;

      const payments = [];
      const startDate = new Date(contract.data.start_date);
      
      for (let i = 0; i < months; i++) {
        const paymentMonth = new Date(startDate);
        paymentMonth.setMonth(startDate.getMonth() + i);
        
        const dueDate = new Date(paymentMonth);
        dueDate.setDate(5); // استحقاق في الخامس من كل شهر

        payments.push({
          contract_id: contractId,
          payment_month: paymentMonth.toISOString().slice(0, 10),
          amount: contract.data.monthly_rent,
          currency: contract.data.currency,
          due_date: dueDate.toISOString().slice(0, 10),
          status: 'pending' as const,
          payment_method: 'bank_transfer',
          late_fee: 0,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });
      }

      const { data, error } = await supabase
        .from('rent_payments')
        .insert(payments)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      toast.success('تم إنشاء المدفوعات الشهرية بنجاح');
    },
    onError: (error) => {
      console.error('Error generating payments:', error);
      toast.error('حدث خطأ في إنشاء المدفوعات الشهرية');
    },
  });

  return {
    rentPayments,
    paymentsLoading,
    addRentPayment,
    isAddingPayment,
    updatePaymentStatus,
    isUpdatingPayment,
    generateMonthlyPayments,
    isGeneratingPayments,
  };
};
