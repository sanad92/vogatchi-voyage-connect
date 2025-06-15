
import React from "react";
import { Button } from "@/components/ui/button";
import { HotelBooking } from "@/types/hotelBooking";
import { Customer } from "@/types/customer";

interface FormActionsSectionProps {
  isSubmitting: boolean;
  selectedCustomer: Customer | null;
  booking?: HotelBooking | null;
  onCancel: () => void;
}

const FormActionsSection = ({ 
  isSubmitting, 
  selectedCustomer, 
  booking, 
  onCancel 
}: FormActionsSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Button 
          type="submit" 
          disabled={isSubmitting || !selectedCustomer}
          className={`${!selectedCustomer ? 'bg-gray-400 cursor-not-allowed' : ''}`}
        >
          {isSubmitting ? 'جاري الحفظ...' : booking ? 'تحديث الحجز' : 'إنشاء الحجز'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
      
      {!selectedCustomer && (
        <p className="text-red-500 text-sm">* يجب اختيار عميل لتفعيل زر الحفظ</p>
      )}
    </div>
  );
};

export default FormActionsSection;
