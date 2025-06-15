import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HotelBooking, NewHotelBooking } from "@/types/hotelBooking";
import { Customer } from "@/types/customer";
import { useBookingCalculations } from "@/hooks/useBookingCalculations";
import { useHotelBookingData } from "@/hooks/useHotelBookingData";
import { useHotelBookingValidation } from "@/hooks/useHotelBookingValidation";
import { useHotelBookingSubmission } from "@/hooks/useHotelBookingSubmission";
import { useCurrentEmployee } from "@/hooks/useCurrentEmployee";
import { toast } from "sonner";

interface UseHotelBookingFormProps {
  booking?: HotelBooking | null;
  onSuccess: () => void;
}

export const useHotelBookingForm = ({ booking, onSuccess }: UseHotelBookingFormProps) => {
  const { currentEmployee } = useCurrentEmployee();
  
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
      currency: booking.currency || 'EGP',
      payment_method: booking.payment_method,
      paid_amount: booking.paid_amount,
      payment_due_date: booking.payment_due_date,
      supplier_id: (booking as any).supplier_id || '', // مبدئياً لأي حجوزات قديمة، سيأخذ القيمة أو فارغ
    } : {
      currency: 'EGP',
      booking_agent_name: currentEmployee?.full_name || 'مستخدم غير محدد'
    }
  });

  // تعيين بيانات موظف الحجز تلقائياً ومنع تغييرها
  useEffect(() => {
    if (currentEmployee && !booking) {
      setValue('booking_agent_name', currentEmployee.full_name);
      // قفل الحقل ضد التغيير
      const agentNameField = document.getElementById('booking_agent_name') as HTMLInputElement;
      if (agentNameField) {
        agentNameField.readOnly = true;
        agentNameField.disabled = true;
      }
    }
  }, [currentEmployee, booking, setValue]);

  // منع تغيير اسم موظف الحجز في أي وقت
  useEffect(() => {
    const currentAgentName = watch('booking_agent_name');
    const expectedAgentName = currentEmployee?.full_name || 'مستخدم غير محدد';
    
    if (currentAgentName !== expectedAgentName && !booking) {
      setValue('booking_agent_name', expectedAgentName);
    }
  }, [watch('booking_agent_name'), currentEmployee, booking, setValue]);

  // التحقق من أن المورد معرف
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

  const sanitizeBookingData = (data: NewHotelBooking) => {
    // Numeric fields: make empty string --> null or default
    const parsedHotelStarRating = data.hotel_star_rating === "" || data.hotel_star_rating == null
      ? null
      : typeof data.hotel_star_rating === "string"
        ? parseInt(data.hotel_star_rating)
        : data.hotel_star_rating;

    const parsedNumAdults = data.number_of_adults === "" || data.number_of_adults == null
      ? 1
      : typeof data.number_of_adults === "string"
        ? parseInt(data.number_of_adults)
        : data.number_of_adults;

    const parsedNumChildren = data.number_of_children === "" || data.number_of_children == null
      ? 0
      : typeof data.number_of_children === "string"
        ? parseInt(data.number_of_children)
        : data.number_of_children;

    const parsedCostPerNight = data.cost_per_night === "" || data.cost_per_night == null
      ? 0
      : typeof data.cost_per_night === "string"
        ? parseFloat(data.cost_per_night)
        : data.cost_per_night;

    const parsedSellingPrice = data.selling_price_per_night === "" || data.selling_price_per_night == null
      ? 0
      : typeof data.selling_price_per_night === "string"
        ? parseFloat(data.selling_price_per_night)
        : data.selling_price_per_night;

    const parsedPaidAmount = data.paid_amount === "" || data.paid_amount == null
      ? 0
      : typeof data.paid_amount === "string"
        ? parseFloat(data.paid_amount)
        : data.paid_amount;

    // Handle supplier_id: allow custom supplier name if ID not present
    let outSupplierId = data.supplier_id;
    if ((!data.supplier_id || data.supplier_id === "") && data.supplier_name && data.supplier_name.trim() !== "") {
      outSupplierId = null;
    }

    // Return the sanitized object
    return {
      ...data,
      hotel_star_rating: parsedHotelStarRating,
      number_of_adults: parsedNumAdults,
      number_of_children: parsedNumChildren,
      cost_per_night: parsedCostPerNight,
      selling_price_per_night: parsedSellingPrice,
      paid_amount: parsedPaidAmount,
      supplier_id: outSupplierId,
    };
  };

  const onSubmit = async (rawData: NewHotelBooking) => {
    // Sanitize data before sending
    const data = sanitizeBookingData(rawData);

    //تأكد من أن بيانات موظف الحجز صحيحة وغير قابلة للتغيير
    const bookingData = {
      ...data,
      booking_agent_id: currentEmployee?.id,
      booking_agent_name: currentEmployee?.full_name || data.booking_agent_name
    };

    // التحقق من اختيار اسم مورد على الأقل
    if (!bookingData.supplier_name || bookingData.supplier_name.trim() === "") {
      toast.error("يجب اختيار مورد الفندق أو إدخال اسم مورد مخصص.");
      return;
    }

    // supplier_id يمكن أن يكون null إذا المورد مخصص، لنجعل هذا التحقق فقط على اسم المورد
    if (!validateBookingData(bookingData, selectedCustomer)) {
      return;
    }

    await submitBooking(bookingData, selectedCustomer!, selectedRequests);
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
    onSubmit,
    currentEmployee
  };
};
