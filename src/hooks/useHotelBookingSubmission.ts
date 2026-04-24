import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HotelBooking, NewHotelBooking } from "@/types/hotelBooking";
import { Customer } from "@/types/customer";
import { useOrgId } from "./useOrgId";

interface UseHotelBookingSubmissionProps {
  booking?: HotelBooking | null;
  onSuccess: (saved?: { id: string }) => void;
}

export const useHotelBookingSubmission = ({ booking, onSuccess }: UseHotelBookingSubmissionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const orgId = useOrgId();

  const submitBooking = async (
    data: NewHotelBooking,
    selectedCustomer: Customer,
    selectedRequests: string[]
  ) => {
    setIsSubmitting(true);
    try {
      const { custom_request, adults, children, attachment_urls, ...rest } = data;

      // Calculate nights for total
      const checkIn = new Date(rest.check_in_date);
      const checkOut = new Date(rest.check_out_date);
      const nights = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
      const rooms = Number(rest.number_of_rooms) || 1;
      const additional = Number(rest.additional_costs) || 0;
      const vat = Number(rest.vat_amount) || 0;
      const sellingPerNight = Number(rest.selling_price_per_night) || 0;
      const costPerNight = Number(rest.cost_per_night) || 0;
      const totalCustomer = sellingPerNight * nights * rooms + additional + (rest.vat_included ? 0 : vat);
      const totalCost = costPerNight * nights * rooms;
      const profit = totalCustomer - totalCost - (Number(rest.commission_amount) || 0);
      const paid = Number(rest.paid_amount) || 0;
      const remaining = Math.max(0, totalCustomer - paid);

      const submitData: any = {
        organization_id: orgId,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        booking_agent_name: rest.booking_agent_name || null,
        booking_agent_id: rest.booking_agent_id || null,
        hotel_id: rest.hotel_id || null,
        hotel_name: rest.hotel_name || '',
        hotel_star_rating: rest.hotel_star_rating || null,
        destination_city: rest.destination_city || '',
        check_in_date: rest.check_in_date,
        check_out_date: rest.check_out_date,
        number_of_nights: nights,
        number_of_rooms: rooms,
        room_type: rest.room_type || '',
        room_view: rest.room_view || null,
        number_of_adults: Number(adults) || 1,
        number_of_children: Number(children) || 0,
        children_ages: rest.children_ages || null,
        meal_plan: rest.meal_plan || '',
        booking_reference_supplier: rest.booking_reference_supplier || null,
        cancellation_policy: rest.cancellation_policy || null,
        supplier_id: rest.supplier_id || null,
        supplier_name: rest.supplier_name || '',
        cost_per_night: costPerNight,
        selling_price_per_night: sellingPerNight,
        additional_costs: additional,
        vat_amount: vat,
        vat_included: !!rest.vat_included,
        commission_amount: Number(rest.commission_amount) || 0,
        total_cost_customer: totalCustomer,
        total_profit: profit,
        currency: rest.currency || 'EGP',
        payment_method: rest.payment_method || null,
        paid_amount: paid,
        remaining_amount: remaining,
        payment_due_date: rest.payment_due_date || null,
        status_id: rest.status_id || null,
        booking_source: rest.booking_source || null,
        internal_notes: rest.internal_notes || null,
        attachment_urls: attachment_urls || [],
      };

      let bookingId = booking?.id;

      if (booking) {
        const { error } = await supabase
          .from('hotel_bookings')
          .update(submitData)
          .eq('id', booking.id);
        if (error) throw error;
        toast.success('تم تحديث الحجز بنجاح');
      } else {
        const { data: inserted, error } = await supabase
          .from('hotel_bookings')
          .insert(submitData)
          .select('id')
          .single();
        if (error) throw error;
        bookingId = inserted.id;
        toast.success('تم إنشاء الحجز بنجاح');
      }

      // Save special requests (delete + insert pattern)
      if (bookingId) {
        await supabase.from('booking_special_requests').delete().eq('booking_id', bookingId);
        const requestRows: any[] = [];
        for (const reqId of selectedRequests) {
          requestRows.push({ booking_id: bookingId, special_request_type_id: reqId });
        }
        if (custom_request && custom_request.trim()) {
          requestRows.push({ booking_id: bookingId, custom_request_text: custom_request.trim() });
        }
        if (requestRows.length) {
          await supabase.from('booking_special_requests').insert(requestRows);
        }
      }

      onSuccess(bookingId ? { id: bookingId } : undefined);
    } catch (error: any) {
      console.error('Error saving booking:', error);
      toast.error(error?.message || 'حدث خطأ في حفظ الحجز');
    } finally {
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, submitBooking };
};
