
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { RentPayment } from '@/types/expenses';
import { useExchangeRates } from './useExchangeRates';
import { SupportedCurrency } from '@/types/currency';

export const useRentPaymentsImproved = () => {
  const queryClient = useQueryClient();
  const { convertToPrimaryCurrency, getCurrentRate } = useExchangeRates();

  // جلب مدفوعات الإيجار مع بيانات العقود
  const { data: rentPayments, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['rent-payments-improved'],
    queryFn: async () => {
      console.log('جاري جلب مدفوعات الإيجار...');
      
      const { data, error } = await supabase
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
        `)
        .order('payment_month', { ascending: false });

      if (error) {
        console.error('خطأ في جلب مدفوعات الإيجار:', error);
        throw error;
      }
      
      // تحويل البيانات إلى النوع المطلوب مع إضافة الحقول الناقصة
      const processedData = data?.map(payment => ({
        ...payment,
        amount_egp: payment.amount_egp || payment.amount, // fallback للقيم القديمة
        exchange_rate: payment.exchange_rate || 1,
      })) as (RentPayment & { contract?: any })[];
      
      console.log('تم جلب مدفوعات الإيجار بنجاح:', processedData?.length);
      return processedData;
    },
    retry: 2,
    staleTime: 1000 * 60 * 5, // 5 دقائق
  });

  // إضافة دفعة إيجار جديدة مع دعم العملات المتعددة
  const { mutateAsync: addRentPayment, isPending: isAddingPayment } = useMutation({
    mutationFn: async (paymentData: Omit<RentPayment, 'id' | 'created_at' | 'updated_at'> & { 
      currency?: SupportedCurrency 
    }) => {
      console.log('جاري إضافة دفعة إيجار:', paymentData);

      // التحقق من صحة البيانات
      if (!paymentData.contract_id) {
        throw new Error('يجب اختيار عقد إيجار');
      }

      if (!paymentData.payment_month) {
        throw new Error('يجب تحديد شهر الدفع');
      }

      if (!paymentData.amount || paymentData.amount <= 0) {
        throw new Error('يجب إدخال مبلغ صحيح');
      }

      if (!paymentData.due_date) {
        throw new Error('يجب تحديد تاريخ الاستحقاق');
      }

      // إذا كانت العملة مختلفة عن الجنيه المصري، احسب المبلغ بالجنيه
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

      if (error) {
        console.error('خطأ في إضافة دفعة الإيجار:', error);
        throw error;
      }

      console.log('تم إضافة دفعة الإيجار بنجاح:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments-improved'] });
      queryClient.invalidateQueries({ queryKey: ['rent-contracts'] });
      toast.success('تم إضافة دفعة الإيجار بنجاح');
    },
    onError: (error: any) => {
      console.error('خطأ في إضافة دفعة الإيجار:', error);
      let errorMessage = 'حدث خطأ أثناء إضافة دفعة الإيجار';
      
      if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    },
  });

  // تحديث حالة دفعة الإيجار
  const { mutateAsync: updatePaymentStatus, isPending: isUpdatingPayment } = useMutation({
    mutationFn: async ({ id, status, payment_date, payment_method, notes }: { 
      id: string; 
      status: 'pending' | 'paid' | 'overdue' | 'cancelled';
      payment_date?: string;
      payment_method?: string;
      notes?: string;
    }) => {
      console.log('جاري تحديث حالة دفعة الإيجار:', { id, status });

      if (!id) {
        throw new Error('معرف الدفعة مطلوب');
      }

      const updateData: any = { 
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'paid') {
        updateData.payment_date = payment_date || new Date().toISOString().split('T')[0];
        if (payment_method) {
          updateData.payment_method = payment_method;
        }
      }

      if (notes) {
        updateData.notes = notes;
      }

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

      if (error) {
        console.error('خطأ في تحديث حالة دفعة الإيجار:', error);
        throw error;
      }

      console.log('تم تحديث حالة دفعة الإيجار بنجاح:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments-improved'] });
      toast.success('تم تحديث حالة الدفعة بنجاح');
    },
    onError: (error: any) => {
      console.error('خطأ في تحديث حالة دفعة الإيجار:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الدفعة');
    },
  });

  // حذف دفعة إيجار
  const { mutateAsync: deleteRentPayment, isPending: isDeletingPayment } = useMutation({
    mutationFn: async (paymentId: string) => {
      console.log('جاري حذف دفعة الإيجار:', paymentId);

      if (!paymentId) {
        throw new Error('معرف الدفعة مطلوب');
      }

      const { error } = await supabase
        .from('rent_payments')
        .delete()
        .eq('id', paymentId);

      if (error) {
        console.error('خطأ في حذف دفعة الإيجار:', error);
        throw error;
      }

      console.log('تم حذف دفعة الإيجار بنجاح');
      return paymentId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rent-payments-improved'] });
      toast.success('تم حذف دفعة الإيجار بنجاح');
    },
    onError: (error: any) => {
      console.error('خطأ في حذف دفعة الإيجار:', error);
      toast.error('حدث خطأ أثناء حذف دفعة الإيجار');
    },
  });

  // حساب إجمالي المدفوعات بالجنيه المصري
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
          total += payment.amount; // fallback
        }
      } else {
        total += payment.amount;
      }
    }
    return total;
  };

  // حساب إحصائيات مدفوعات الإيجار
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
    // البيانات
    rentPayments,
    paymentsLoading,
    paymentsError,
    
    // العمليات
    addRentPayment,
    isAddingPayment,
    updatePaymentStatus,
    isUpdatingPayment,
    deleteRentPayment,
    isDeletingPayment,
    
    // المساعدات
    calculateTotalPaymentsInEGP,
    getPaymentStatistics,
  };
};
