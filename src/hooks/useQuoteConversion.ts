import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { toast } from 'sonner';

export interface QuoteConversionResult {
  booking_id: string;
  invoice_id: string;
  already_converted: boolean;
  supplier_order_count?: number;
}

export const useQuoteConversion = () => {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const queryClient = useQueryClient();
  const convertToBooking = useMutation({
    mutationFn: async ({ quoteId }: { quoteId: string }): Promise<QuoteConversionResult> => {
      if (!orgId || !user?.id || !quoteId) throw new Error('تعذر تحديد الشركة أو عرض السعر');
      // Only identifiers cross the API boundary; prices/items come from the locked source.
      const { data, error } = await callUntypedRpc<QuoteConversionResult>('convert_quote_atomic', {
        _org: orgId, _quote: quoteId,
      });
      if (error) throw new Error(error.message);
      if (!data || typeof data.booking_id !== 'string' || !data.booking_id ||
        typeof data.invoice_id !== 'string' || !data.invoice_id) {
        throw new Error('لم يرجع الخادم تأكيد التحويل؛ أعد المحاولة بأمان');
      }
      return data;
    },
    onSuccess: async (result) => {
      await Promise.all(['quotes', 'quote', 'quote-bookings', 'unified-bookings', 'bookings',
        'invoices', 'supplier-payment-orders', 'supplier-invoices', 'booking-workspace']
        .map(key => queryClient.invalidateQueries({ queryKey: [key] })));
      toast.success(result.already_converted ? 'العرض محوّل بالفعل؛ تم استرجاع نفس الحجز' :
        'تم إنشاء الحجز وفاتورة العميل ومستحقات الموردين');
    },
    onError: (err: Error) => toast.error('فشل في التحويل: ' + err.message),
  });
  return { convertToBooking };
};
