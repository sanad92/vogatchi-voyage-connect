
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HotelBooking, NewHotelBooking } from "@/types/hotelBooking";
import { Customer } from "@/types/customer";
import { useBookingCalculations } from "@/hooks/useBookingCalculations";
import { useHotelBookingData } from "@/hooks/useHotelBookingData";
import { useHotelBookingValidation } from "@/hooks/useHotelBookingValidation";
import { useHotelBookingSubmission } from "@/hooks/useHotelBookingSubmission";

interface UseHotelBookingFormProps {
  booking?: HotelBooking | null;
  onSuccess: () => void;
}

export const useHotelBookingForm = ({ booking, onSuccess }: UseHotelBookingFormProps) => {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<NewHotelBooking>({
    defaultValues: booking ? {
      customer_name: booking.customer_name,
      booking_agent_name: booking.booking_agent_name,
      hotel_name: booking.hotel_name,
      hotel_star_rating: booking.hotel_star_rating,
      destination_city: booking.destination_city,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      room_type: booking.room_type,
      number_of_adults: booking.number_of_adults,
      number_of_children: booking.number_of_children,
      children_ages: booking.children_ages,
      meal_plan: booking.meal_plan,
      booking_reference_supplier: booking.booking_reference_supplier,
      cancellation_policy: booking.cancellation_policy,
      supplier_name: booking.supplier_name,
      cost_per_night: booking.cost_per_night,
      selling_price_per_night: booking.selling_price_per_night,
      currency: booking.currency || 'SAR',
      payment_method: booking.payment_method,
      paid_amount: booking.paid_amount,
      payment_due_date: booking.payment_due_date,
    } : {
      currency: 'SAR'
    }
  });

  const checkInDate = watch('check_in_date');
  const checkOutDate = watch('check_out_date');
  const costPerNight = watch('cost_per_night');
  const sellingPricePerNight = watch('selling_price_per_night');

  const { numberOfNights, totalCostCustomer, totalProfit } = useBookingCalculations({
    checkInDate,
    checkOutDate,
    costPerNight,
    sellingPricePerNight
  });

  const {
    suppliers,
    selectedCustomer,
    selectedRequests,
    setSelectedRequests,
    handleCustomerSelect,
    fetchExistingRequests
  } = useHotelBookingData({ booking });

  const { validateBookingData } = useHotelBookingValidation();
  const { isSubmitting, submitBooking } = useHotelBookingSubmission({ booking, onSuccess });

  // Handle fetching existing requests when editing
  useEffect(() => {
    if (booking?.id) {
      fetchExistingRequests(setValue);
    }
  }, [booking, setValue, fetchExistingRequests]);

  const onSubmit = async (data: NewHotelBooking) => {
    if (!validateBookingData(data, selectedCustomer)) {
      return;
    }

    await submitBooking(data, selectedCustomer!, selectedRequests);
  };

  return {
    register,
    handleSubmit,
    setValue,
    watch,
    errors,
    suppliers,
    isSubmitting,
    selectedCustomer,
    selectedRequests,
    setSelectedRequests,
    numberOfNights,
    totalCostCustomer,
    totalProfit,
    handleCustomerSelect,
    onSubmit
  };
};
