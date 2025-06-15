
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { HotelBooking, NewHotelBooking, Customer } from "@/types/hotelBooking";

interface UseHotelBookingSubmissionProps {
  booking?: HotelBooking | null;
  onSuccess: () => void;
}

export const useHotelBookingSubmission = ({ booking, onSuccess }: UseHotelBookingSubmissionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveSpecialRequests = async (bookingId: string, formData: NewHotelBooking, selectedRequests: string[]) => {
    // Delete existing special requests
    if (booking?.id) {
      await supabase
        .from('booking_special_requests')
        .delete()
        .eq('booking_id', bookingId);
    }

    // Save selected special request types
    if (selectedRequests.length > 0) {
      const requestsToInsert = selectedRequests.map(requestId => ({
        booking_id: bookingId,
        special_request_type_id: requestId
      }));

      const { error } = await supabase
        .from('booking_special_requests')
        .insert(requestsToInsert);
      
      if (error) throw error;
    }

    // Save custom request if provided
    if (formData.custom_request?.trim()) {
      const { error } = await supabase
        .from('booking_special_requests')
        .insert({
          booking_id: bookingId,
          custom_request_text: formData.custom_request.trim()
        });
      
      if (error) throw error;
    }
  };

  const submitBooking = async (
    data: NewHotelBooking, 
    selectedCustomer: Customer, 
    selectedRequests: string[]
  ) => {
    setIsSubmitting(true);
    try {
      const submitData = {
        ...data,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name
      };

      let bookingId: string;

      if (booking) {
        const { error } = await supabase
          .from('hotel_bookings')
          .update(submitData)
          .eq('id', booking.id);
        if (error) throw error;
        bookingId = booking.id;
        toast.success('تم تحديث الحجز بنجاح');
      } else {
        const { data: newBooking, error } = await supabase
          .from('hotel_bookings')
          .insert([submitData])
          .select()
          .single();
        if (error) throw error;
        bookingId = newBooking.id;
        toast.success('تم إنشاء الحجز بنجاح');
      }

      // Save special requests
      await saveSpecialRequests(bookingId, data, selectedRequests);

      onSuccess();
    } catch (error) {
      console.error('Error saving booking:', error);
      toast.error('حدث خطأ في حفظ الحجز');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submitBooking
  };
};
