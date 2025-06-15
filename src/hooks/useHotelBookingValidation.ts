
import { toast } from "sonner";
import { NewHotelBooking, Customer } from "@/types/hotelBooking";

export const useHotelBookingValidation = () => {
  const validateBookingData = (data: NewHotelBooking, selectedCustomer: Customer | null): boolean => {
    // التحقق من اختيار العميل
    if (!selectedCustomer) {
      toast.error('يجب اختيار عميل أو إضافة عميل جديد قبل إتمام الحجز');
      return false;
    }

    // التحقق من صحة البيانات المالية
    if (!data.cost_per_night || data.cost_per_night <= 0) {
      toast.error('يجب إدخال تكلفة صحيحة للليلة');
      return false;
    }

    if (!data.selling_price_per_night || data.selling_price_per_night <= 0) {
      toast.error('يجب إدخال سعر بيع صحيح للليلة');
      return false;
    }

    if (!data.supplier_name) {
      toast.error('يجب اختيار مورد للحجز');
      return false;
    }

    return true;
  };

  return {
    validateBookingData
  };
};
