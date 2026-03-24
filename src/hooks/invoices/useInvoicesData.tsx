
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
          customer:customers(id, name, email, phone),
          hotel_booking:hotel_bookings!invoices_booking_id_fkey(
            id, customer_name, hotel_name, destination_city, check_in_date, 
            check_out_date, internal_booking_number, voucher_sent
          ),
          flight_booking:flight_bookings!invoices_booking_id_fkey(
            id, customer_name, airline_name, departure_date, 
            booking_reference, confirmation_number
          ),
          transport_booking:transport_bookings!invoices_booking_id_fkey(
            id, customer_name, service_type, pickup_location, dropoff_location, 
            service_date, booking_reference
          ),
          car_rental:car_rentals!invoices_booking_id_fkey(
            id, customer_name, vehicle_make, vehicle_model, pickup_date, 
            return_date, rental_reference
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(5000);

      // تطبيق الفلاتر
      if (filters?.searchTerm) {
        query = query.or(`
          invoice_number.ilike.%${filters.searchTerm}%,
          notes.ilike.%${filters.searchTerm}%
        `);
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

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching invoices:', error);
        throw error;
      }

      return data;
    },
  });
};
