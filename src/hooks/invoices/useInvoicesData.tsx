
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InvoiceFilters {
  searchTerm?: string;
  status?: string;
  bookingType?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
}

export const useInvoicesData = (filters?: InvoiceFilters) => {
  return useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, email, phone)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5000);

      if (filters?.searchTerm) {
        query = query.or(`invoice_number.ilike.%${filters.searchTerm}%,notes.ilike.%${filters.searchTerm}%`);
      }
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }
      if (filters?.bookingType && filters.bookingType !== 'all') {
        query = query.eq('booking_type', filters.bookingType);
      }
      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }
      if (filters?.dateFrom) {
        query = query.gte('issued_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('issued_date', filters.dateTo);
      }

      const { data: invoices, error } = await query;
      if (error) {
        console.error('Error fetching invoices:', error);
        throw error;
      }

      if (!invoices || invoices.length === 0) return invoices;

      // Polymorphic lookup: booking_id maps to different tables based on booking_type
      const groupIds = (type: string) => invoices
        .filter((i: any) => i.booking_type === type && i.booking_id)
        .map((i: any) => i.booking_id);

      const hotelIds = groupIds('hotel');
      const flightIds = groupIds('flight');
      const transportIds = groupIds('transport');
      const carIds = groupIds('car_rental');

      const [hotels, flights, transports, cars] = await Promise.all([
        hotelIds.length
          ? supabase.from('hotel_bookings').select('id, customer_name, hotel_name, destination_city, check_in_date, check_out_date, internal_booking_number, voucher_sent').in('id', hotelIds)
          : Promise.resolve({ data: [] as any[] }),
        flightIds.length
          ? supabase.from('flight_bookings').select('id, customer_name, airline:airlines(name), departure_date, booking_reference, confirmation_number').in('id', flightIds)
          : Promise.resolve({ data: [] as any[] }),
        transportIds.length
          ? supabase.from('transport_bookings').select('id, customer_name, pickup_location, dropoff_location, departure_date, booking_reference').in('id', transportIds)
          : Promise.resolve({ data: [] as any[] }),
        carIds.length
          ? supabase.from('car_rentals').select('id, customer_name, vehicle_make, vehicle_model, rental_start_date, rental_end_date, rental_reference').in('id', carIds)
          : Promise.resolve({ data: [] as any[] }),

      ]);

      const idx = (arr: any[]) => Object.fromEntries((arr || []).map((r: any) => [r.id, r]));
      const hMap = idx(hotels.data || []);
      const fMap = idx(flights.data || []);
      const tMap = idx(transports.data || []);
      const cMap = idx(cars.data || []);

      return invoices.map((inv: any) => ({
        ...inv,
        hotel_booking: inv.booking_type === 'hotel' ? hMap[inv.booking_id] : null,
        flight_booking: inv.booking_type === 'flight' ? fMap[inv.booking_id] : null,
        transport_booking: inv.booking_type === 'transport' ? tMap[inv.booking_id] : null,
        car_rental: inv.booking_type === 'car_rental' ? cMap[inv.booking_id] : null,
      }));
    },
    staleTime: 3 * 60 * 1000,
  });
};
