
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RentPayment } from '@/types/expenses';
import { useExchangeRates } from './useExchangeRates';
import { SupportedCurrency } from '@/types/currency';

export const useRentPaymentOperations = () => {
  const queryClient = useQueryClient();
  const { convertToPrimaryCurrency, getCurrentRate } = useExchangeRates();

  const addRentPayment = useMutation({
    mutationFn: async (paymentData: Omit<RentPayment, 'id' | 'created_at' | 'updated_at'> & { 
      currency?: SupportedCurrency 
    }) => {
      console.log('جاري إضافة دفعة إيجار:', paymentData);

      if (!paymentData.contract_id || !paymentData.payment_month || !paymentData.amount || !paymentData.due_date) {
        throw new Error('جميع البيانات الأساسية مطلوبة');
      }

      let amountEGP = paymentData.amount;
      let exchangeRate = 1;

      if (paymentData.currency && paymentData.currency !== 'EGP') {
        try {
          exchangeRate = await getCurrentRate(paymentData.currency, 'EGP');
          amountEGP = await convertToPrimaryCurrency(paymentData.amount, paymentData.currency);
        } catch (error) {
          console.error('خطأ في تحويل العملة:', error);
          toast.error('خطأ في تحويل العملة، سيتم استخدام سعر الصرف الافتراضي');
        }
      }

      const { data, error } = await supabase
        .from('rent_payments')
        .insert({
          ...paymentData,
          currency: paymentData.currency || 'EGP',
          exchange_rate: exchangeRate,
          amount_egp: amountEGP,
          status: paymentData.status || 'pending',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select(`
          *,
          contract:rent_contracts(
            contract_number, 
            property_address, 
            landlord_name
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments-improved'] });
      queryClient.invalidateQueries({ queryKey: ['rent-contracts'] });
      toast.success('تم إضافة دفعة الإيجار بنجاح');
    },
    onError: (error: any) => {
      console.error('خطأ في إضافة دفعة الإيجار:', error);
      toast.error(error.message || 'حدث خطأ أثناء إضافة دفعة الإيجار');
    },
  });

  const updatePaymentStatus = useMutation({
    mutationFn: async ({ id, status, payment_date, payment_method, notes }: { 
      id: string; 
      status: 'pending' | 'paid' | 'overdue' | 'cancelled';
      payment_date?: string;
      payment_method?: string;
      notes?: string;
    }) => {
      if (!id) throw new Error('معرف الدفعة مطلوب');

      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'paid') {
        updateData.payment_date = payment_date || new Date().toISOString().split('T')[0];
        if (payment_method) updateData.payment_method = payment_method;
      }
      if (notes) updateData.notes = notes;

      const { data, error } = await supabase
        .from('rent_payments')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          contract:rent_contracts(
            contract_number, 
            property_address, 
            landlord_name
          )
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments-improved'] });
      toast.success('تم تحديث حالة الدفعة بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء تحديث حالة الدفعة');
    },
  });

  const deleteRentPayment = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!paymentId) throw new Error('معرف الدفعة مطلوب');

      const { error } = await supabase
        .from('rent_payments')
        .delete()
        .eq('id', paymentId);

      if (error) throw error;
      return paymentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments-improved'] });
      toast.success('تم حذف دفعة الإيجار بنجاح');
    },
    onError: () => {
      toast.error('حدث خطأ أثناء حذف دفعة الإيجار');
    },
  });

  return {
    addRentPayment: addRentPayment.mutateAsync,
    isAddingPayment: addRentPayment.isPending,
    updatePaymentStatus: updatePaymentStatus.mutateAsync,
    isUpdatingPayment: updatePaymentStatus.isPending,
    deleteRentPayment: deleteRentPayment.mutateAsync,
    isDeletingPayment: deleteRentPayment.isPending,
  };
};
