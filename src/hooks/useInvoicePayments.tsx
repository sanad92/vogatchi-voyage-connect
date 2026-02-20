
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InvoicePayment {
  id: string;
  invoice_id: string;
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  bank_account_id?: string;
  reference_number?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export const useInvoicePayments = (invoiceId?: string) => {
  const queryClient = useQueryClient();

  // جلب مدفوعات فاتورة معينة
  const { data: payments, isLoading, error } = useQuery({
    queryKey: ['invoice-payments', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      
      const { data, error } = await (supabase
        .from('invoice_payments' as any)
        .select(`
          *,
          bank_account:bank_accounts(account_name)
        `)
        .eq('invoice_id', invoiceId)
        .order('payment_date', { ascending: false }) as any);

      if (error) throw error;
      return data as InvoicePayment[];
    },
    enabled: !!invoiceId,
  });

  // إضافة دفعة جديدة
  const addPaymentMutation = useMutation({
    mutationFn: async (paymentData: Omit<InvoicePayment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data: user } = await supabase.auth.getUser();
      
      const { data, error } = await (supabase
        .from('invoice_payments' as any)
        .insert([{
          ...paymentData,
          created_by: user.user?.id,
        }])
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم إضافة الدفعة بنجاح');
    },
    onError: (error: Error) => {
      console.error('Error adding payment:', error);
      toast.error('حدث خطأ أثناء إضافة الدفعة');
    },
  });

  // تحديث دفعة
  const updatePaymentMutation = useMutation({
    mutationFn: async ({ paymentId, updateData }: { paymentId: string; updateData: Partial<InvoicePayment> }) => {
      const { data, error } = await (supabase
        .from('invoice_payments' as any)
        .update(updateData)
        .eq('id', paymentId)
        .select()
        .single() as any);

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم تحديث الدفعة بنجاح');
    },
    onError: (error: Error) => {
      console.error('Error updating payment:', error);
      toast.error('حدث خطأ أثناء تحديث الدفعة');
    },
  });

  // حذف دفعة
  const deletePaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const { error } = await supabase
        .from('invoice_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice-payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم حذف الدفعة بنجاح');
    },
    onError: (error: Error) => {
      console.error('Error deleting payment:', error);
      toast.error('حدث خطأ أثناء حذف الدفعة');
    },
  });

  return {
    payments: payments || [],
    isLoading,
    error,
    addPayment: addPaymentMutation.mutate,
    updatePayment: updatePaymentMutation.mutate,
    deletePayment: deletePaymentMutation.mutate,
    isAdding: addPaymentMutation.isPending,
    isUpdating: updatePaymentMutation.isPending,
    isDeleting: deletePaymentMutation.isPending,
  };
};
