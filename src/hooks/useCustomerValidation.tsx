
import { supabase } from "@/integrations/supabase/client";

export const useCustomerValidation = () => {
  const checkDuplicatePhone = async (phone: string, excludeId?: string) => {
    if (!phone || phone.length < 10) return false;
    
    try {
      console.log('🔍 فحص تكرار رقم الهاتف:', phone);
      let query = supabase
        .from('customers')
        .select('id, name')
        .eq('phone', phone);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query.limit(1);
      
      if (error) {
        console.error('❌ خطأ في فحص تكرار الهاتف:', error);
        return false;
      }
      
      const isDuplicate = data && data.length > 0;
      console.log('✅ نتيجة فحص التكرار:', { isDuplicate, existingCustomer: isDuplicate ? data[0] : null });
      
      return isDuplicate ? data[0] : false;
    } catch (error) {
      console.error('❌ خطأ عام في فحص تكرار الهاتف:', error);
      return false;
    }
  };

  return {
    checkDuplicatePhone
  };
};
