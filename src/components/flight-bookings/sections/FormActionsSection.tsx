
import React from 'react';
import { Button } from "@/components/ui/button";

interface FormActionsSectionProps {
  isSubmitting: boolean;
}

const FormActionsSection = ({ isSubmitting }: FormActionsSectionProps) => {
  return (
    <div className="flex justify-end gap-4">
      <Button type="button" variant="outline">
        إلغاء
      </Button>
      <Button 
        type="submit" 
        disabled={isSubmitting}
      >
        {isSubmitting ? "جاري الحفظ..." : "إنشاء حجز الطيران"}
      </Button>
    </div>
  );
};

export default FormActionsSection;
