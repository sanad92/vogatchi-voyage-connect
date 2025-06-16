import { supabase } from "@/integrations/supabase/client";
import { useEnhancedCustomerValidation } from "./useEnhancedCustomerValidation";

// Keep the old hook for backward compatibility
export const useCustomerValidation = () => {
  const { checkDuplicatePhone } = useEnhancedCustomerValidation();
  
  return {
    checkDuplicatePhone: async (phone: string, excludeId?: string) => {
      const result = await checkDuplicatePhone(phone, excludeId);
      
      // Return old format for compatibility
      if (result.isDuplicate) {
        return result.existingCustomer;
      }
      
      return false;
    }
  };
};
