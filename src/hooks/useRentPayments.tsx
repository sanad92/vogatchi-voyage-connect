
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RentPayment } from '@/types/expenses';
import { useExchangeRates } from './useExchangeRates';
import { SupportedCurrency } from '@/types/currency';
import { useOrgId } from './useOrgId';
import { getFriendlyDatabaseError } from '@/utils/databaseErrors';

export const useRentPayments = () => {
  const queryClient = useQueryClient();
  const orgId = useOrgId();
  const { convertToPrimaryCurrency, getCurrentRate } = useExchangeRates();

  const { data: rentPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['rent-payments', orgId],
    queryFn: async () => {
      let query = supabase
        .from('rent_payments')
        .select(`*, contract:rent_contracts(contract_number, property_address, landlord_name)`)
        .order('payment_month', { ascending: false });

      if (orgId) query = query.eq('organization_id', orgId);

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((payment: any) => ({
        ...payment,
        amount_egp: payment.amount_egp || payment.amount,
        exchange_rate: payment.exchange_rate || 1,
      })) as (RentPayment & { contract?: any })[];
    },
    enabled: !!orgId,
  });

  const { mutateAsync: addRentPayment, isPending: isAddingPayment } = useMutation({
    mutationFn: async (paymentData: Omit<RentPayment, 'id' | 'created_at' | 'updated_at'> & {
      currency?: SupportedCurrency;
    }) => {
      if (!orgId) throw new Error('لم يتم تحديد المؤسسة الحالية');
      if (!paymentData.contract_id) throw new Error('عقد الإيجار مطلوب');
      if (!paymentData.amount || paymentData.amount <= 0) throw new Error('مبلغ الدفعة يجب أن يكون أكبر من صفر');
      if (!paymentData.due_date) throw new Error('تاريخ الاستحقاق مطلوب');

      let amountEGP = paymentData.amount;
      let exchangeRate = 1;

      if (paymentData.currency && paymentData.currency !== 'EGP') {
        exchangeRate = await getCurrentRate(paymentData.currency, 'EGP');
        amountEGP = await convertToPrimaryCurrency(paymentData.amount, paymentData.currency);
      }

      const userId = (await supabase.auth.getUser()).data.user?.id;
      const insertPayload: any = {
        ...paymentData,
        currency: paymentData.currency || 'EGP',
        exchange_rate: exchangeRate,
        amount_egp: amountEGP,
        created_by: userId,
        organization_id: orgId,
      };

      const { data, error } = await supabase
        .from('rent_payments')
        .insert(insertPayload)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments'] });
      toast.success('تم إضافة دفعة الإيجار بنجاح');
    },
    onError: (error: any) => {
      toast.error('حدث خطأ في إضافة دفعة الإيجار: ' + getFriendlyDatabaseError(error));
      console.error('Error adding rent payment:', error);
    },
  });

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
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + (error?.message || ''));
    },
  });

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
