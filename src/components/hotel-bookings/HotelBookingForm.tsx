
import { HotelBooking } from "@/types/hotelBooking";
import { useHotelBookingForm } from "@/hooks/useHotelBookingForm";
import CustomerSection from "./sections/CustomerSection";
import HotelInfoSection from "./sections/HotelInfoSection";
import RoomDetailsSection from "./sections/RoomDetailsSection";
import SpecialRequestsSection from "./sections/SpecialRequestsSection";
import SupplierCostSection from "./sections/SupplierCostSection";
import FormActionsSection from "./sections/FormActionsSection";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import PriceCalculationDisplay from "@/components/common/PriceCalculationDisplay";

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
    onSubmit,
    currentEmployee,
    calculations
  } = useHotelBookingForm({ booking, onSuccess });

  // تعيين الجنيه المصري كعملة افتراضية
  useEffect(() => {
    if (!booking && !watch('currency')) {
      setValue('currency', 'EGP');
    }
  }, [booking, setValue, watch]);

  return (
    <div className="space-y-6">
      {/* معلومات موظف الحجز */}
      {currentEmployee && (
        <div className="bg-blue-50 p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <User className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">موظف الحجز</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white">
              {currentEmployee.full_name}
            </Badge>
            {currentEmployee.employee_code && (
              <Badge variant="outline" className="bg-white text-xs">
                {currentEmployee.employee_code}
              </Badge>
            )}
          </div>
        </div>
      )}

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

        {/* عرض الحسابات التلقائية */}
        <PriceCalculationDisplay 
          calculations={calculations}
          type="hotel"
          currency={watch('currency') || 'EGP'}
        />

        <FormActionsSection
          isSubmitting={isSubmitting}
          selectedCustomer={selectedCustomer}
          booking={booking}
          onCancel={onCancel}
        />
      </form>
    </div>
  );
};

export default HotelBookingForm;
