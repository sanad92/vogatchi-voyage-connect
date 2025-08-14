
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HotelBooking, NewHotelBooking } from "@/types/hotelBooking";
import { Customer } from "@/types/customer";
import { useBookingCalculations } from "@/hooks/useBookingCalculations";
import { useHotelBookingData } from "@/hooks/useHotelBookingData";
import { useHotelBookingValidation } from "@/hooks/useHotelBookingValidation";
import { useHotelBookingSubmission } from "@/hooks/useHotelBookingSubmission";
import { useAutoCalculations } from "@/hooks/useAutoCalculations";
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
      adults: booking.number_of_adults,
      children: booking.number_of_children,
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
      supplier_id: (booking as any).supplier_id || '',
    } : {
      currency: 'EGP',
      booking_agent_name: currentEmployee?.full_name || 'مستخدم غير محدد'
    }
  });

  useEffect(() => {
    if (currentEmployee && !booking) {
      setValue('booking_agent_name', currentEmployee.full_name);
      const agentNameField = document.getElementById('booking_agent_name') as HTMLInputElement;
      if (agentNameField) {
        agentNameField.readOnly = true;
        agentNameField.disabled = true;
      }
    }
  }, [currentEmployee, booking, setValue]);

  useEffect(() => {
    const currentAgentName = watch('booking_agent_name');
    const expectedAgentName = currentEmployee?.full_name || 'مستخدم غير محدد';
    
    if (currentAgentName !== expectedAgentName && !booking) {
      setValue('booking_agent_name', expectedAgentName);
    }
  }, [watch('booking_agent_name'), currentEmployee, booking, setValue]);

  const checkInDate = watch('check_in_date');
  const checkOutDate = watch('check_out_date');
  const costPerNight = watch('cost_per_night');
  const sellingPricePerNight = watch('selling_price_per_night');

  // إضافة الحسابات التلقائية الجديدة
  const { calculations, updateCalculations } = useAutoCalculations({
    calculationType: 'hotel',
    currency: watch('currency') || 'EGP',
    onCalculationUpdate: (calc) => {
      // تحديث القيم المحسوبة في النموذج
      console.log('تم تحديث الحسابات:', calc);
    }
  });

  const { numberOfNights, totalCostCustomer, totalProfit } = useBookingCalculations({
    checkInDate,
    checkOutDate,
    costPerNight,
    sellingPricePerNight
  });

  // تحديث الحسابات عند تغيير البيانات
  useEffect(() => {
    const formData = {
      cost_per_night: costPerNight,
      selling_price_per_night: sellingPricePerNight,
      check_in_date: checkInDate,
      check_out_date: checkOutDate,
      paid_amount: watch('paid_amount')
    };
    updateCalculations(formData);
  }, [costPerNight, sellingPricePerNight, checkInDate, checkOutDate, watch('paid_amount')]);

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

  useEffect(() => {
    if (booking?.id) {
      fetchExistingRequests(setValue);
    }
  }, [booking, setValue, fetchExistingRequests]);

  const sanitizeBookingData = (data: NewHotelBooking) => {
    const parseOptionalNumber = (val: unknown, fallback: number | null = null) => {
      if (typeof val === "number") return val;
      if (typeof val === "string" && val.trim() !== "") {
        const n = Number(val);
        return isNaN(n) ? fallback : n;
      }
      return fallback;
    };

    const parsedHotelStarRating = parseOptionalNumber(data.hotel_star_rating, null);
    const parsedNumAdults = parseOptionalNumber(data.adults, 1);
    const parsedNumChildren = parseOptionalNumber(data.children, 0);
    const parsedCostPerNight = parseOptionalNumber(data.cost_per_night, 0);
    const parsedSellingPrice = parseOptionalNumber(data.selling_price_per_night, 0);
    const parsedPaidAmount = parseOptionalNumber(data.paid_amount, 0);

    let outSupplierId = data.supplier_id;
    if ((typeof data.supplier_id === "string" && data.supplier_id.trim() === "") || !data.supplier_id) {
      if (data.supplier_name && data.supplier_name.trim() !== "") {
        outSupplierId = null;
      }
    }

    // هنا نتحكم بقيمة booking_agent_id: نرسلها فقط إذا فعلاً يوجد موظف حقيقي معرفه صالح (متواجد في employees)
    const bookingAgentId = currentEmployee && currentEmployee.id && currentEmployee.employee_code !== "USER"
      ? currentEmployee.id
      : undefined;

    return {
      ...data,
      hotel_star_rating: parsedHotelStarRating,
      adults: parsedNumAdults,
      children: parsedNumChildren,
      cost_per_night: parsedCostPerNight,
      selling_price_per_night: parsedSellingPrice,
      paid_amount: parsedPaidAmount,
      supplier_id: outSupplierId,
      booking_agent_id: bookingAgentId, // فقط إذا موظف فعلي
    };
  };

  const onSubmit = async (rawData: NewHotelBooking) => {
    const data = sanitizeBookingData(rawData);

    // التأكد من عدم تمرير booking_agent_id إذا لم يكن فعليًا
    const bookingData = { ...data };
    if (!data.booking_agent_id) {
      delete bookingData.booking_agent_id;
    }

    if (!bookingData.supplier_name || bookingData.supplier_name.trim() === "") {
      toast.error("يجب اختيار مورد الفندق أو إدخال اسم مورد مخصص.");
      return;
    }

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
    currentEmployee,
    calculations
  };
};
