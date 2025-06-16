
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedCustomerValidation } from "./useEnhancedCustomerValidation";

// Keep the old hook for backward compatibility
export const useCustomerValidation = () => {
  const { checkDuplicatePhone } = useEnhancedCustomerValidation();
  
  return {
    checkDuplicatePhone: async (phone: string, excludeId?: string) => {
      const result = await checkDuplicatePhone(phone, excludeId);
      
      // التحقق من نوع النتيجة بشكل آمن
      if (typeof result === 'object' && result !== null && 'isDuplicate' in result) {
        // Return old format for compatibility
        if (result.isDuplicate && 'existingCustomer' in result) {
          return result.existingCustomer;
        }
      }
      
      return false;
    }
  };
};
