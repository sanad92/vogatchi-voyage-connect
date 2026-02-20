import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PaymentIntentData {
  amount: number;
  currency?: string;
  bookingId?: string;
  invoiceId?: string;
  description?: string;
}

interface PaymentConfirmData {
  paymentIntentId: string;
}

export const usePayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createPaymentIntent = async (data: PaymentIntentData) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: result, error } = await supabase.functions.invoke(
        'create-payment-intent',
        {
          body: data
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ في إنشاء عملية الدفع';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const confirmPayment = async (data: PaymentConfirmData) => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: result, error } = await supabase.functions.invoke(
        'confirm-payment',
        {
          body: data
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ في تأكيد الدفع';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const getPaymentIntents = async (invoiceId?: string, bookingId?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      let query = (supabase.from('payment_intents' as any) as any).select('*');
      
      if (invoiceId) {
        query = query.eq('invoice_id', invoiceId);
      }
      
      if (bookingId) {
        query = query.eq('booking_id', bookingId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ في جلب بيانات الدفع';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createPaymentIntent,
    confirmPayment,
    getPaymentIntents,
    isLoading,
    error
  };
};