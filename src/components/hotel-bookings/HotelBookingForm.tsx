
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { HotelBooking, NewHotelBooking, HotelSupplier, Customer } from "@/types/hotelBooking";
import { useBookingCalculations } from "@/hooks/useBookingCalculations";
import CustomerSection from "./sections/CustomerSection";
import HotelInfoSection from "./sections/HotelInfoSection";
import RoomDetailsSection from "./sections/RoomDetailsSection";
import SupplierCostSection from "./sections/SupplierCostSection";

interface HotelBookingFormProps {
  booking?: HotelBooking | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const HotelBookingForm = ({ booking, onSuccess, onCancel }: HotelBookingFormProps) => {
  const [suppliers, setSuppliers] = useState<HotelSupplier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

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
      payment_method: booking.payment_method,
      paid_amount: booking.paid_amount,
      payment_due_date: booking.payment_due_date,
    } : {}
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

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data } = await supabase
        .from('hotel_suppliers')
        .select('*')
        .order('name');
      if (data) setSuppliers(data);
    };
    fetchSuppliers();
  }, []);

  // Fetch existing customer if editing
  useEffect(() => {
    const fetchCustomer = async () => {
      if (booking?.customer_id) {
        const { data } = await supabase
          .from('customers')
          .select('id, name, phone, email, nationality')
          .eq('id', booking.customer_id)
          .single();
        if (data) {
          setSelectedCustomer(data);
        }
      }
    };
    fetchCustomer();
  }, [booking]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
  };

  const onSubmit = async (data: NewHotelBooking) => {
    setIsSubmitting(true);
    try {
      const submitData = {
        ...data,
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || data.customer_name
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
          .insert([submitData]);
        if (error) throw error;
        toast.success('تم إنشاء الحجز بنجاح');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving booking:', error);
      toast.error('حدث خطأ في حفظ الحجز');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <CustomerSection
        register={register}
        setValue={setValue}
        errors={errors}
        selectedCustomer={selectedCustomer}
        onCustomerSelect={handleCustomerSelect}
      />

      <HotelInfoSection
        register={register}
        setValue={setValue}
        errors={errors}
        numberOfNights={numberOfNights}
      />

      <RoomDetailsSection
        register={register}
        setValue={setValue}
        errors={errors}
      />

      <SupplierCostSection
        register={register}
        setValue={setValue}
        errors={errors}
        suppliers={suppliers}
        totalCostCustomer={totalCostCustomer}
        totalProfit={totalProfit}
      />

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'جاري الحفظ...' : booking ? 'تحديث الحجز' : 'إنشاء الحجز'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  );
};

export default HotelBookingForm;
