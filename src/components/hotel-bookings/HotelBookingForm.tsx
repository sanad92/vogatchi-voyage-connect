
import { HotelBooking } from "@/types/hotelBooking";
import { useHotelBookingForm } from "@/hooks/useHotelBookingForm";
import CustomerSection from "./sections/CustomerSection";
import HotelInfoSection from "./sections/HotelInfoSection";
import RoomDetailsSection from "./sections/RoomDetailsSection";
import SpecialRequestsSection from "./sections/SpecialRequestsSection";
import SupplierCostSection from "./sections/SupplierCostSection";
import FormActionsSection from "./sections/FormActionsSection";
import { useEffect } from "react";

interface HotelBookingFormProps {
  booking?: HotelBooking | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const HotelBookingForm = ({ booking, onSuccess, onCancel }: HotelBookingFormProps) => {
  const {
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
  } = useHotelBookingForm({ booking, onSuccess });

  // تعيين الجنيه المصري كعملة افتراضية
  useEffect(() => {
    if (!booking && !watch('currency')) {
      setValue('currency', 'EGP');
    }
  }, [booking, setValue, watch]);

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

      <SpecialRequestsSection
        register={register}
        setValue={setValue}
        errors={errors}
        selectedRequests={selectedRequests}
        onRequestsChange={setSelectedRequests}
      />

      <SupplierCostSection
        register={register}
        setValue={setValue}
        watch={watch}
        errors={errors}
        suppliers={suppliers}
        totalCostCustomer={totalCostCustomer}
        totalProfit={totalProfit}
      />

      <FormActionsSection
        isSubmitting={isSubmitting}
        selectedCustomer={selectedCustomer}
        booking={booking}
        onCancel={onCancel}
      />
    </form>
  );
};

export default HotelBookingForm;
