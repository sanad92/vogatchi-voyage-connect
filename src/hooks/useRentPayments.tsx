
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RentPayment } from '@/types/expenses';
import { useExchangeRates } from './useExchangeRates';
import { SupportedCurrency } from '@/types/currency';

export const useRentPayments = () => {
  const queryClient = useQueryClient();
  const { convertToPrimaryCurrency, getCurrentRate } = useExchangeRates();

  // جلب مدفوعات الإيجار
  const { data: rentPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['rent-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rent_payments')
        .select(`
          *,
          contract:rent_contracts(contract_number, property_address, landlord_name)
        `)
        .order('payment_month', { ascending: false });

      if (error) throw error;
      
      // تحويل البيانات إلى النوع المطلوب مع إضافة الحقول الناقصة
      return data?.map(payment => ({
        ...payment,
        amount_egp: payment.amount_egp || payment.amount, // fallback للقيم القديمة
        exchange_rate: payment.exchange_rate || 1,
      })) as (RentPayment & { contract?: any })[];
    },
  });

  // إضافة دفعة إيجار جديدة مع دعم العملات المتعددة
  const { mutateAsync: addRentPayment, isPending: isAddingPayment } = useMutation({
    mutationFn: async (paymentData: Omit<RentPayment, 'id' | 'created_at' | 'updated_at'> & { 
      currency?: SupportedCurrency 
    }) => {
      // إذا كانت العملة مختلفة عن الجنيه المصري، احسب المبلغ بالجنيه
      let amountEGP = paymentData.amount;
      let exchangeRate = 1;

      if (paymentData.currency && paymentData.currency !== 'EGP') {
        exchangeRate = await getCurrentRate(paymentData.currency, 'EGP');
        amountEGP = await convertToPrimaryCurrency(paymentData.amount, paymentData.currency);
      }

      const { data, error } = await supabase
        .from('rent_payments')
        .insert({
          ...paymentData,
          currency: paymentData.currency || 'EGP',
          exchange_rate: exchangeRate,
          amount_egp: amountEGP,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      toast.success('تم إضافة دفعة الإيجار بنجاح');
    },
    onError: (error) => {
      toast.error('حدث خطأ في إضافة دفعة الإيجار');
      console.error('Error adding rent payment:', error);
    },
  });

  // تحديث حالة دفعة الإيجار
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
      toast.success('تم تحديث حالة الدفعة بنجاح');
    },
  });

  // حساب إجمالي المدفوعات بالجنيه المصري
  const calculateTotalPaymentsInEGP = async (payments: RentPayment[]) => {
    let total = 0;
    for (const payment of payments) {
      if (payment.amount_egp) {
        total += payment.amount_egp;
      } else if (payment.currency && payment.currency !== 'EGP') {
        const amountInEGP = await convertToPrimaryCurrency(payment.amount, payment.currency as SupportedCurrency);
        total += amountInEGP;
      } else {
        total += payment.amount;
      }
    }
    return total;
  };

  return {
    rentPayments,
    paymentsLoading,
    addRentPayment,
    isAddingPayment,
    updatePaymentStatus,
    isUpdatingPayment,
    calculateTotalPaymentsInEGP,
  };
};
