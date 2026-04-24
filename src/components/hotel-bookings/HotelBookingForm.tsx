import { HotelBooking } from "@/types/hotelBooking";
import { useHotelBookingForm } from "@/hooks/useHotelBookingForm";
import CustomerSection from "./sections/CustomerSection";
import HotelInfoSection from "./sections/HotelInfoSection";
import RoomDetailsSection from "./sections/RoomDetailsSection";
import SpecialRequestsSection from "./sections/SpecialRequestsSection";
import SupplierCostSection from "./sections/SupplierCostSection";
import AdvancedSection from "./sections/AdvancedSection";
import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Loader2, Save } from "lucide-react";
import PriceCalculationDisplay from "@/components/common/PriceCalculationDisplay";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    calculations,
  } = useHotelBookingForm({ booking, onSuccess });

  // الجنيه المصري كعملة افتراضية
  useEffect(() => {
    if (!booking && !watch("currency")) {
      setValue("currency", "EGP");
    }
  }, [booking, setValue, watch]);

  // اختصار Cmd/Ctrl+S للحفظ
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSubmit(onSubmit)();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit, onSubmit]);

  return (
    <div className="space-y-4 pb-24">
      {/* موظف الحجز */}
      {currentEmployee && (
        <div className="bg-muted/50 p-3 rounded-lg border flex items-center gap-2 flex-wrap">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">موظف الحجز:</span>
          <Badge variant="outline">{currentEmployee.full_name}</Badge>
          {currentEmployee.employee_code && (
            <Badge variant="outline" className="text-xs">
              {currentEmployee.employee_code}
            </Badge>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Accordion
          type="multiple"
          defaultValue={["customer", "hotel", "room", "cost"]}
          className="space-y-2"
        >
          <AccordionItem value="customer" className="border rounded-lg px-4">
            <AccordionTrigger className="text-base font-semibold">
              👤 بيانات العميل
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <CustomerSection
                register={register}
                setValue={setValue}
                errors={errors}
                selectedCustomer={selectedCustomer}
                onCustomerSelect={handleCustomerSelect}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="hotel" className="border rounded-lg px-4">
            <AccordionTrigger className="text-base font-semibold">
              🏨 الفندق والتواريخ
              {numberOfNights > 0 && (
                <Badge variant="secondary" className="mr-2">
                  {numberOfNights} ليلة
                </Badge>
              )}
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <HotelInfoSection
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="room" className="border rounded-lg px-4">
            <AccordionTrigger className="text-base font-semibold">
              🛏️ تفاصيل الغرفة
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <RoomDetailsSection
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="cost" className="border rounded-lg px-4">
            <AccordionTrigger className="text-base font-semibold">
              💰 التكاليف والأرباح
            </AccordionTrigger>
            <AccordionContent className="pt-2 space-y-4">
              <SupplierCostSection
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
              />
              <PriceCalculationDisplay
                calculations={calculations}
                type="hotel"
                currency={watch("currency") || "EGP"}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="requests" className="border rounded-lg px-4">
            <AccordionTrigger className="text-base font-semibold">
              ✨ طلبات خاصة
              {selectedRequests.length > 0 && (
                <Badge variant="secondary" className="mr-2">
                  {selectedRequests.length}
                </Badge>
              )}
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <SpecialRequestsSection
                register={register}
                setValue={setValue}
                errors={errors}
                selectedRequests={selectedRequests}
                onRequestsChange={setSelectedRequests}
              />
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="advanced" className="border rounded-lg px-4">
            <AccordionTrigger className="text-base font-semibold">
              ⚙️ إعدادات متقدمة (المصدر، سياسة الإلغاء، ملاحظات)
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <AdvancedSection
                register={register}
                setValue={setValue}
                watch={watch}
                errors={errors}
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Sticky Footer */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t p-3 z-50">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-muted-foreground hidden md:block">
              {!selectedCustomer ? (
                <span className="text-destructive">* اختر عميل لتفعيل الحفظ</span>
              ) : (
                <span>
                  💡 Ctrl+S للحفظ السريع
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 ms-auto">
              <Button type="button" variant="outline" onClick={onCancel}>
                إلغاء
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !selectedCustomer}
                className="min-w-[140px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 ml-2" />
                    {booking ? "تحديث الحجز" : "إنشاء الحجز"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default HotelBookingForm;
