import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { toast } from 'sonner';
import type { Quote, QuoteItem } from './useQuotes';
import { useOrganizationSettings } from './useOrganizationSettings';
import { calculateFinancialBreakdown } from '@/utils/calculationHelpers';

export const useQuoteConversion = () => {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const queryClient = useQueryClient();
  const { settings } = useOrganizationSettings();

  const convertToBooking = useMutation({
    mutationFn: async ({ quote, items }: { quote: Quote; items: QuoteItem[] }) => {
      const createdBookingIds: string[] = [];
      const currency = settings?.currency || 'EGP';

      // Create bookings for each item type
      for (const item of items) {
        if (item.item_type === 'hotel') {
          const { data, error } = await supabase.from('hotel_bookings').insert({
            organization_id: orgId!,
            quote_id: quote.id,
            customer_id: quote.customer_id,
            customer_name: quote.customer_name || '',
            hotel_name: item.description,
            supplier_id: item.supplier_id,
            booking_reference: `BK-${quote.quote_number}`,
            check_in_date: quote.travel_date || new Date().toISOString().split('T')[0],
            check_out_date: quote.return_date || new Date().toISOString().split('T')[0],
            cost_price_per_night: item.cost_price,
            selling_price_per_night: item.selling_price,
            number_of_nights: item.quantity,
            number_of_rooms: 1,
            total_cost: item.total_cost,
            total_selling_price: item.total_selling,
            total_profit: item.total_selling - item.total_cost,
            currency,
            booking_agent_name: quote.employees?.full_name || null,
          }).select('id').single();
          if (error) throw error;
          if (data) createdBookingIds.push(data.id);
        } else if (item.item_type === 'flight') {
          const { data, error } = await supabase.from('flight_bookings').insert({
            organization_id: orgId!,
            quote_id: quote.id,
            customer_id: quote.customer_id,
            customer_name: quote.customer_name || '',
            booking_reference: `FL-${quote.quote_number}`,
            departure_date: quote.travel_date || new Date().toISOString().split('T')[0],
            arrival_date: quote.return_date || quote.travel_date || new Date().toISOString().split('T')[0],
            ticket_cost: item.cost_price,
            selling_price: item.selling_price,
            total_cost: item.total_cost,
            total_selling_price: item.total_selling,
            total_profit: item.total_selling - item.total_cost,
            number_of_passengers: item.quantity,
            currency,
            booking_agent_name: quote.employees?.full_name || null,
            supplier_id: item.supplier_id,
          }).select('id').single();
          if (error) throw error;
          if (data) createdBookingIds.push(data.id);
        } else if (item.item_type === 'transport') {
          const { data, error } = await supabase.from('transport_bookings').insert({
            organization_id: orgId!,
            quote_id: quote.id,
            customer_id: quote.customer_id,
            customer_name: quote.customer_name || '',
            booking_reference: `TR-${quote.quote_number}`,
            departure_date: quote.travel_date || new Date().toISOString().split('T')[0],
            cost_per_trip: item.cost_price,
            selling_price_per_trip: item.selling_price,
            total_cost: item.total_cost,
            total_profit: item.total_selling - item.total_cost,
            currency,
            supplier_id: item.supplier_id,
          }).select('id').single();
          if (error) throw error;
          if (data) createdBookingIds.push(data.id);
        } else if (item.item_type === 'car_rental') {
          const { data, error } = await supabase.from('car_rentals').insert({
            organization_id: orgId!,
            quote_id: quote.id,
            customer_id: quote.customer_id,
            customer_name: quote.customer_name || '',
            rental_reference: `CR-${quote.quote_number}`,
            rental_start_date: quote.travel_date || new Date().toISOString().split('T')[0],
            rental_end_date: quote.return_date || new Date().toISOString().split('T')[0],
            daily_rate: item.selling_price,
            supplier_daily_cost: item.cost_price,
            rental_duration_days: item.quantity,
            total_rental_cost: item.total_selling,
            supplier_total_cost: item.total_cost,
            total_profit: item.total_selling - item.total_cost,
            currency,
            supplier_id: item.supplier_id,
          }).select('id').single();
          if (error) throw error;
          if (data) createdBookingIds.push(data.id);
        }
      }

      // Generate invoice number
      const { data: invNum } = await supabase.rpc('generate_invoice_number');
      const financialBreakdown = calculateFinancialBreakdown({
        subtotal: quote.subtotal ?? 0,
        discountAmount: quote.discount_amount ?? 0,
        vatRate: quote.vat_rate ?? 0,
        totalCost: quote.total_cost ?? 0,
      });

      // Create consolidated invoice
      const { error: invErr } = await supabase.from('invoices').insert({
        organization_id: orgId!,
        quote_id: quote.id,
        customer_id: quote.customer_id,
        customer_name: quote.customer_name,
        invoice_number: invNum || `INV-${Date.now()}`,
        booking_id: createdBookingIds[0] || null,
        booking_type: items[0]?.item_type === 'hotel' ? 'hotel' : items[0]?.item_type === 'flight' ? 'flight' : 'transport',
        currency,
        subtotal: financialBreakdown.subtotal,
        discount_amount: financialBreakdown.discountAmount,
        vat_rate: financialBreakdown.vatRate,
        vat_amount: financialBreakdown.vatAmount,
        final_amount: financialBreakdown.totalAmount,
        remaining_amount: financialBreakdown.totalAmount,
        total_paid_amount: 0,
        payment_status: 'unpaid',
        status: 'unpaid',
        notes: `فاتورة من عرض سعر رقم ${quote.quote_number}`,
        created_by: user?.id,
      });
      if (invErr) throw invErr;

      // Update quote status to accepted
      const { error: statusErr } = await supabase
        .from('quotes')
        .update({ status: 'accepted' })
        .eq('id', quote.id);
      if (statusErr) throw statusErr;

      return { bookingIds: createdBookingIds };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      queryClient.invalidateQueries({ queryKey: ['quote'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم تحويل العرض إلى حجوزات وفاتورة بنجاح');
    },
    onError: (err: Error) => toast.error('فشل في التحويل: ' + err.message),
  });

  return { convertToBooking };
};
