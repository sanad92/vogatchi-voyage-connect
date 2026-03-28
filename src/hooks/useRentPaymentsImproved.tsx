
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RentPayment } from '@/types/expenses';
import { useExchangeRates } from './useExchangeRates';
import { SupportedCurrency } from '@/types/currency';
import { useRentPaymentOperations } from './useRentPaymentOperations';
import { useOrgId } from './useOrgId';

export const useRentPaymentsImproved = () => {
  const { convertToPrimaryCurrency } = useExchangeRates();
  const operations = useRentPaymentOperations();
  const orgId = useOrgId();

  const { data: rentPayments, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['rent-payments-improved', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      
      const query = supabase
        .from('rent_payments')
        .select(`
          *,
          contract:rent_contracts(
            id,
            contract_number, 
            property_address, 
            landlord_name,
            monthly_rent,
            currency
          )
        `) as any;
      const { data, error } = await query
        .eq('organization_id', orgId)
        .order('payment_month', { ascending: false });

      if (error) throw error;
      
      const processedData = data?.map(payment => ({
        ...payment,
        amount_egp: payment.amount_egp || payment.amount,
        exchange_rate: payment.exchange_rate || 1,
      })) as (RentPayment & { contract?: any })[];
      
      return processedData;
    },
    enabled: !!orgId,
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

  const calculateTotalPaymentsInEGP = async (payments: RentPayment[]) => {
    let total = 0;
    for (const payment of payments) {
      if (payment.amount_egp) {
        total += payment.amount_egp;
      } else if (payment.currency && payment.currency !== 'EGP') {
        try {
          const amountInEGP = await convertToPrimaryCurrency(payment.amount, payment.currency as SupportedCurrency);
          total += amountInEGP;
        } catch (error) {
          console.error('خطأ في تحويل العملة للدفعة:', payment.id, error);
          total += payment.amount;
        }
      } else {
        total += payment.amount;
      }
    }
    return total;
  };

  const getPaymentStatistics = () => {
    if (!rentPayments) return null;

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthPayments = rentPayments.filter(
      payment => payment.payment_month.startsWith(currentMonth)
    );

    const pendingPayments = rentPayments.filter(p => p.status === 'pending');
    const overduePayments = rentPayments.filter(p => 
      p.status === 'pending' && new Date(p.due_date) < new Date()
    );
    const paidThisMonth = currentMonthPayments.filter(p => p.status === 'paid');

    const totalPendingAmount = pendingPayments.reduce((sum, p) => sum + (p.amount_egp || p.amount), 0);
    const totalPaidThisMonth = paidThisMonth.reduce((sum, p) => sum + (p.amount_egp || p.amount), 0);

    return {
      pendingCount: pendingPayments.length,
      overdueCount: overduePayments.length,
      paidThisMonthCount: paidThisMonth.length,
      totalPendingAmount,
      totalPaidThisMonth,
      totalPaymentsCount: rentPayments.length,
    };
  };

  return {
    rentPayments,
    paymentsLoading,
    paymentsError,
    calculateTotalPaymentsInEGP,
    getPaymentStatistics,
    ...operations,
  };
};
