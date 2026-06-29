
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getFriendlyDatabaseError } from '@/utils/databaseErrors';

export const useInvoiceActions = () => {
  const queryClient = useQueryClient();

  // تحديث حالة الفاتورة
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      invoiceId, 
      status, 
      paymentDate 
    }: { 
      invoiceId: string; 
      status: string; 
      paymentDate?: string; 
    }) => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'paid' && paymentDate) {
        updateData.paid_date = paymentDate;
      }

      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم تحديث حالة الفاتورة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating invoice status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة: ' + getFriendlyDatabaseError(error));
    },
  });

  // حذف الفاتورة
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم حذف الفاتورة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error deleting invoice:', error);
      toast.error('حدث خطأ أثناء حذف الفاتورة: ' + getFriendlyDatabaseError(error));
    },
  });

  // تحديث الفاتورة
  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ 
      invoiceId, 
      updateData 
    }: { 
      invoiceId: string; 
      updateData: any; 
    }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم تحديث الفاتورة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating invoice:', error);
      toast.error('حدث خطأ أثناء تحديث الفاتورة: ' + getFriendlyDatabaseError(error));
    },
  });

  return {
    updateStatus: updateStatusMutation.mutateAsync,
    deleteInvoice: deleteInvoiceMutation.mutateAsync,
    updateInvoice: updateInvoiceMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
    isDeletingInvoice: deleteInvoiceMutation.isPending,
    isUpdatingInvoice: updateInvoiceMutation.isPending,
  };
};
