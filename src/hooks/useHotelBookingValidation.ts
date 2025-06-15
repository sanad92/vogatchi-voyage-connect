
import { toast } from "sonner";
import { NewHotelBooking } from "@/types/hotelBooking";
import { Customer } from "@/types/customer";

export const useHotelBookingValidation = () => {
  const validateBookingData = (data: any, selectedCustomer: Customer | null): boolean => {
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

    // فقط supplier_name ضروري (وليس id)
    if (!data.supplier_name || data.supplier_name.trim() === "") {
      toast.error('يجب اختيار مورد للحجز أو إدخال اسم مورد مخصص');
      return false;
    }
    return true;
  };

  return {
    validateBookingData
  };
};

