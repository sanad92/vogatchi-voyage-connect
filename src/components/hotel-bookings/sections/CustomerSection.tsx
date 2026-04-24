
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { NewHotelBooking } from "@/types/hotelBooking";
import { Customer } from "@/types/customer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";
import CustomerSelection from "@/components/shared/CustomerSelection";
import { useCurrentEmployeeEnhanced } from "@/hooks/useCurrentEmployeeEnhanced";

interface CustomerSectionProps {
  register: UseFormRegister<NewHotelBooking>;
  setValue: UseFormSetValue<NewHotelBooking>;
  errors: FieldErrors<NewHotelBooking>;
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
}

const CustomerSection = ({ 
  register, 
  setValue, 
  errors, 
  selectedCustomer, 
  onCustomerSelect 
}: CustomerSectionProps) => {
  const { currentEmployee } = useCurrentEmployeeEnhanced();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">معلومات العميل وموظف الحجز</h3>
      </div>

      {/* Customer Selection */}
      <CustomerSelection
        selectedCustomer={selectedCustomer}
        onCustomerSelect={onCustomerSelect}
        register={register}
        setValue={setValue}
        errors={errors}
      />

      {/* Booking Agent Information - Read Only */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <Label htmlFor="booking_agent_name" className="text-sm font-medium text-gray-700 mb-2 block">
          موظف الحجز
        </Label>
        <div className="flex items-center gap-2">
          <Input
            id="booking_agent_name"
            {...register("booking_agent_name")}
            value={currentEmployee?.full_name || "مستخدم غير محدد"}
            readOnly
            className="bg-gray-100 cursor-not-allowed"
            disabled
          />
          {currentEmployee?.employee_code && (
            <Badge variant="outline" className="text-xs">
              {currentEmployee.employee_code}
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          يتم تعيين موظف الحجز تلقائياً من المستخدم المُسجل حالياً
        </p>
      </div>
    </div>
  );
};

export default CustomerSection;
