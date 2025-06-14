
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FlightBooking, PassengerDetail, BaggageInfo } from "@/types/flightBooking";

export const useFlightBookings = (searchTerm: string) => {
  return useQuery({
    queryKey: ['flight-bookings', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('flight_bookings')
        .select(`
          *,
          departure_airport:departure_airport_id (
            id,
            name,
            city,
            iata_code
          ),
          arrival_airport:arrival_airport_id (
            id,
            name,
            city,
            iata_code
          ),
          airline:airline_id (
            id,
            name,
            iata_code
          ),
          flight_class:flight_class_id (
            id,
            name,
            name_ar,
            code
          ),
          booking_status:status_id (
            id,
            name,
            name_ar,
            color
          )
        `)
        .order('created_at', { ascending: false });

      if (searchTerm) {
        query = query.or(`
          customer_name.ilike.%${searchTerm}%,
          booking_reference.ilike.%${searchTerm}%,
          flight_number.ilike.%${searchTerm}%,
          confirmation_number.ilike.%${searchTerm}%
        `);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Transform the data to match our FlightBooking interface with proper type conversion
      return (data || []).map((booking: any): FlightBooking => {
        // Safely parse passenger_details from Json to PassengerDetail[]
        let passengerDetails: PassengerDetail[] = [];
        if (booking.passenger_details) {
          try {
            if (Array.isArray(booking.passenger_details)) {
              passengerDetails = booking.passenger_details.map((passenger: any) => ({
                name: passenger?.name || '',
                passport: passenger?.passport || '',
                date_of_birth: passenger?.date_of_birth || '',
                nationality: passenger?.nationality || ''
              }));
            }
          } catch (e) {
            console.warn('Error parsing passenger details:', e);
            passengerDetails = [];
          }
        }

        // Safely parse baggage_info from Json to BaggageInfo
        let baggageInfo: BaggageInfo = {};
        if (booking.baggage_info && typeof booking.baggage_info === 'object') {
          try {
            baggageInfo = {
              checked: (booking.baggage_info as any)?.checked || '',
              carry_on: (booking.baggage_info as any)?.carry_on || '',
              extra_baggage: (booking.baggage_info as any)?.extra_baggage || ''
            };
          } catch (e) {
            console.warn('Error parsing baggage info:', e);
            baggageInfo = {};
          }
        }

        return {
          id: booking.id,
          booking_reference: booking.booking_reference,
          customer_id: booking.customer_id,
          customer_name: booking.customer_name,
          booking_agent_name: booking.booking_agent_name,
          booking_date: booking.booking_date,
          departure_airport_id: booking.departure_airport_id,
          arrival_airport_id: booking.arrival_airport_id,
          departure_date: booking.departure_date,
          departure_time: booking.departure_time,
          arrival_date: booking.arrival_date,
          arrival_time: booking.arrival_time,
          flight_number: booking.flight_number,
          airline_id: booking.airline_id,
          flight_class_id: booking.flight_class_id,
          number_of_passengers: booking.number_of_passengers,
          passenger_details: passengerDetails,
          baggage_info: baggageInfo,
          special_requests: booking.special_requests,
          meal_preferences: booking.meal_preferences,
          seat_preferences: booking.seat_preferences,
          ticket_price_per_person: booking.ticket_price_per_person,
          taxes_and_fees: booking.taxes_and_fees,
          total_cost: booking.total_cost,
          supplier_cost: booking.supplier_cost,
          total_profit: booking.total_profit,
          currency: booking.currency,
          payment_method: booking.payment_method,
          paid_amount: booking.paid_amount,
          remaining_amount: booking.remaining_amount,
          payment_due_date: booking.payment_due_date,
          status_id: booking.status_id,
          confirmation_number: booking.confirmation_number,
          ticket_numbers: Array.isArray(booking.ticket_numbers) ? booking.ticket_numbers : [],
          is_round_trip: booking.is_round_trip,
          return_flight_id: booking.return_flight_id,
          supplier_name: booking.supplier_name,
          supplier_reference: booking.supplier_reference,
          invoice_sent: booking.invoice_sent,
          invoice_sent_date: booking.invoice_sent_date,
          voucher_sent: booking.voucher_sent,
          voucher_sent_date: booking.voucher_sent_date,
          supplier_payment_sent: booking.supplier_payment_sent,
          supplier_payment_sent_date: booking.supplier_payment_sent_date,
          created_at: booking.created_at,
          updated_at: booking.updated_at,
          departure_airport: booking.departure_airport,
          arrival_airport: booking.arrival_airport,
          airline: booking.airline,
          flight_class: booking.flight_class,
          booking_status: booking.booking_status
        };
      });
    }
  });
};
