import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { HotelBooking, NewHotelBooking } from "@/types/hotelBooking";
import { Customer } from "@/types/customer";
import { useOrgId } from "./useOrgId";

interface UseHotelBookingSubmissionProps {
  booking?: HotelBooking | null;
  onSuccess: () => void;
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
      const { custom_request, ...bookingDataForTable } = data;
      const submitData = {
        organization_id: orgId,
        customer_id: selectedCustomer.id,
        customer_name: selectedCustomer.name,
        hotel_name: bookingDataForTable.hotel_name || '',
        destination_city: bookingDataForTable.destination_city || '',
        check_in_date: bookingDataForTable.check_in_date,
        check_out_date: bookingDataForTable.check_out_date,
        selling_price_per_night: Number(bookingDataForTable.selling_price_per_night) || 0,
        cost_per_night: Number(bookingDataForTable.cost_per_night) || 0,
        number_of_adults: Number(bookingDataForTable.adults) || 2,
        number_of_children: Number(bookingDataForTable.children) || 0,
        room_type: bookingDataForTable.room_type || '',
        meal_plan: bookingDataForTable.meal_plan || '',
      };

      if (booking) {
        const { error } = await supabase
          .from('hotel_bookings')
          .update(submitData)
          .eq('id', booking.id);
        if (error) throw error;
        toast.success('تم تحديث الحجز بنجاح');
      } else {
        const { error } = await supabase
          .from('hotel_bookings')
          .insert(submitData);
        if (error) throw error;
        toast.success('تم إنشاء الحجز بنجاح');
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving booking:', error);
      toast.error(error?.message || 'حدث خطأ في حفظ الحجز');
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submitBooking
  };
};
