
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FlightBooking, NewFlightBooking } from '@/types/flightBooking';
import { useExchangeRates } from './useExchangeRates';
import { SupportedCurrency } from '@/types/currency';

export const useFlightBookings = () => {
  const queryClient = useQueryClient();
  const { convertToPrimaryCurrency, getCurrentRate } = useExchangeRates();

  // جلب حجوزات الطيران
  const { data: flightBookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ['flight-bookings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('flight_bookings')
        .select(`
          *,
          departure_airport:airports!departure_airport_id(id, name, city, iata_code, country, is_active, created_at),
          arrival_airport:airports!arrival_airport_id(id, name, city, iata_code, country, is_active, created_at),
          airline:airlines(name, iata_code),
          flight_class:flight_classes(name, name_ar),
          booking_status:booking_statuses(name, name_ar, color)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // تحويل البيانات إلى النوع المطلوب
      return data?.map(booking => ({
        ...booking,
        passenger_details: booking.passenger_details as any || [],
        baggage_info: booking.baggage_info as any || {},
      })) as FlightBooking[];
    },
  });

  // إضافة حجز طيران جديد مع دعم العملات المتعددة
  const { mutateAsync: addFlightBooking, isPending: isAddingBooking } = useMutation({
    mutationFn: async (bookingData: NewFlightBooking) => {
      // حساب التكلفة الإجمالية
      const totalCost = bookingData.ticket_price_per_person * bookingData.number_of_passengers + (bookingData.taxes_and_fees || 0);
      
      // حساب أسعار الصرف والقيم بالجنيه المصري
      let exchangeRateToEGP = 1;
      let totalCostEGP = totalCost;
      let supplierCostEGP = bookingData.supplier_cost;

      if (bookingData.currency && bookingData.currency !== 'EGP') {
        exchangeRateToEGP = await getCurrentRate(bookingData.currency as SupportedCurrency, 'EGP');
        totalCostEGP = await convertToPrimaryCurrency(totalCost, bookingData.currency as SupportedCurrency);
        supplierCostEGP = await convertToPrimaryCurrency(bookingData.supplier_cost, bookingData.currency as SupportedCurrency);
      }

      const { data, error } = await supabase
        .from('flight_bookings')
        .insert({
          ...bookingData,
          total_cost: totalCost,
          currency: bookingData.currency || 'EGP',
          exchange_rate_to_egp: exchangeRateToEGP,
          total_cost_egp: totalCostEGP,
          supplier_cost_egp: supplierCostEGP,
          passenger_details: bookingData.passenger_details ? JSON.stringify(bookingData.passenger_details) : null,
          baggage_info: bookingData.baggage_info ? JSON.stringify(bookingData.baggage_info) : null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-bookings'] });
      toast.success('تم إضافة حجز الطيران بنجاح');
    },
    onError: (error) => {
      toast.error('حدث خطأ في إضافة حجز الطيران');
      console.error('Error adding flight booking:', error);
    },
  });

  // تحديث حجز الطيران
  const { mutateAsync: updateFlightBooking, isPending: isUpdatingBooking } = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<NewFlightBooking> }) => {
      // إعادة حساب القيم بالجنيه المصري إذا تم تغيير العملة أو الأسعار
      let updateData: any = { ...updates };
      
      if (updates.currency || updates.ticket_price_per_person || updates.supplier_cost) {
        const currency = updates.currency || 'EGP';
        let exchangeRateToEGP = 1;
        
        if (currency !== 'EGP') {
          exchangeRateToEGP = await getCurrentRate(currency as SupportedCurrency, 'EGP');
        }
        
        if (updates.ticket_price_per_person || updates.taxes_and_fees) {
          const totalCost = (updates.ticket_price_per_person || 0) * (updates.number_of_passengers || 1) + (updates.taxes_and_fees || 0);
          const totalCostEGP = currency !== 'EGP' ? await convertToPrimaryCurrency(totalCost, currency as SupportedCurrency) : totalCost;
          updateData.total_cost_egp = totalCostEGP;
        }
        
        if (updates.supplier_cost) {
          const supplierCostEGP = currency !== 'EGP' ? await convertToPrimaryCurrency(updates.supplier_cost, currency as SupportedCurrency) : updates.supplier_cost;
          updateData.supplier_cost_egp = supplierCostEGP;
        }
        
        updateData.exchange_rate_to_egp = exchangeRateToEGP;
      }

      // تحويل البيانات المعقدة إلى JSON
      if (updates.passenger_details) {
        updateData.passenger_details = JSON.stringify(updates.passenger_details);
      }
      if (updates.baggage_info) {
        updateData.baggage_info = JSON.stringify(updates.baggage_info);
      }

      const { data, error } = await supabase
        .from('flight_bookings')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flight-bookings'] });
      toast.success('تم تحديث حجز الطيران بنجاح');
    },
  });

  // حساب إجمالي الحجوزات بالجنيه المصري
  const calculateTotalBookingsInEGP = async (bookings: FlightBooking[]) => {
    let total = 0;
    for (const booking of bookings) {
      if (booking.total_cost_egp) {
        total += booking.total_cost_egp;
      } else if (booking.currency && booking.currency !== 'EGP') {
        const amountInEGP = await convertToPrimaryCurrency(booking.total_cost, booking.currency as SupportedCurrency);
        total += amountInEGP;
      } else {
        total += booking.total_cost;
      }
    }
    return total;
  };

  return {
    flightBookings,
    bookingsLoading,
    addFlightBooking,
    isAddingBooking,
    updateFlightBooking,
    isUpdatingBooking,
    calculateTotalBookingsInEGP,
  };
};
