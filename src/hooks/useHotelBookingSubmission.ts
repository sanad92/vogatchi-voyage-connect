import { useState } from "react";
import { toast } from "sonner";
import { HotelBooking, NewHotelBooking } from "@/types/hotelBooking";
import { Customer } from "@/types/customer";
import { hotelBookingService } from "@/services/hotelBookingService";

interface UseHotelBookingSubmissionProps {
  booking?: HotelBooking | null;
  onSuccess: () => void;
}

export const useHotelBookingSubmission = ({ booking, onSuccess }: UseHotelBookingSubmissionProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saveSpecialRequests = async (bookingId: string, formData: NewHotelBooking, selectedRequests: string[]) => {
    // TODO: Implement special requests saving in PHP backend
    // For now, this is handled in the main booking creation
    console.log('Special requests will be handled in PHP backend:', { bookingId, selectedRequests, customRequest: formData.custom_request });
  };

  const submitBooking = async (
    data: NewHotelBooking, 
    selectedCustomer: Customer, 
    selectedRequests: string[]
  ) => {
    setIsSubmitting(true);
    try {
      // Remove custom_request from data sent to hotel_bookings table
      const { custom_request, ...bookingDataForTable } = data;
      const submitData = {
        customer_id: selectedCustomer.id,
        hotel_name: bookingDataForTable.hotel_name || '',
        destination_city: bookingDataForTable.destination_city || '',
        check_in_date: bookingDataForTable.check_in_date,
        check_out_date: bookingDataForTable.check_out_date,
        selling_price_per_night: Number(bookingDataForTable.selling_price_per_night) || 0,
        cost_per_night: Number(bookingDataForTable.cost_per_night) || 0,
        adults: Number(bookingDataForTable.adults) || 2,
        children: Number(bookingDataForTable.children) || 0,
        room_type: bookingDataForTable.room_type || '',
        meal_plan: bookingDataForTable.meal_plan || '',
      };

      if (booking) {
        // TODO: Implement update functionality in PHP backend
        toast.error('تحديث الحجوزات غير متاح حالياً');
        return;
      } else {
        const response = await hotelBookingService.createHotelBooking(submitData);
        
        if (response.success) {
          toast.success('تم إنشاء الحجز بنجاح');
          // Save special requests (types + custom)
          await saveSpecialRequests(response.id, data, selectedRequests);
          onSuccess();
        } else {
          throw new Error('فشل في إنشاء الحجز');
        }
      }
    } catch (error: any) {
      console.error('Error saving booking:', error);
      const message = error?.message || 'حدث خطأ في حفظ الحجز، تحقق من البيانات المطلوبة';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    submitBooking
  };
};
