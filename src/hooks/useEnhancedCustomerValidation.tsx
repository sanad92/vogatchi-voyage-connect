
import { supabase } from "@/integrations/supabase/client";

export const useEnhancedCustomerValidation = () => {
  // تنسيق رقم الهاتف لجعله موحد
  const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    // إزالة جميع المسافات والرموز
    let normalized = phone.replace(/[\s\-\(\)\+]/g, '');
    
    // إضافة +20 إذا كان الرقم يبدأ بـ 1 (مصري)
    if (normalized.match(/^1[0-9]{9}$/)) {
      normalized = '20' + normalized;
    }
    
    // إزالة 0 من البداية إذا كان موجود
    if (normalized.startsWith('0')) {
      normalized = normalized.substring(1);
    }
    
    // إضافة +20 إذا لم تكن موجودة
    if (!normalized.startsWith('20') && normalized.length === 10) {
      normalized = '20' + normalized;
    }
    
    return normalized;
  };

  // التحقق من صحة رقم الهاتف
  const validatePhoneNumber = (phone: string): { isValid: boolean; message?: string } => {
    if (!phone) {
      return { isValid: false, message: 'رقم الهاتف مطلوب' };
    }

    const normalized = normalizePhoneNumber(phone);
    
    // فحص الأرقام المصرية
    if (normalized.match(/^20[1][0-9]{9}$/)) {
      return { isValid: true };
    }
    
    // فحص أرقام دولية أخرى (على الأقل 10 أرقام)
    if (normalized.match(/^[0-9]{10,15}$/)) {
      return { isValid: true };
    }
    
    return { 
      isValid: false, 
      message: 'رقم الهاتف غير صحيح. يجب أن يكون رقم هاتف صحيح' 
    };
  };

  // فحص تكرار رقم الهاتف مع تحسينات
  const checkDuplicatePhone = async (phone: string, excludeId?: string) => {
    if (!phone) return false;
    
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      return { isDuplicate: false, error: phoneValidation.message };
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    
    try {
      console.log('🔍 فحص تكرار رقم الهاتف المنسق:', normalizedPhone);
      
      // البحث عن الرقم المنسق والرقم الأصلي
      let query = supabase
        .from('customers')
        .select('id, name, phone')
        .or(`phone.eq.${phone},phone.eq.${normalizedPhone}`);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query.limit(1);
      
      if (error) {
        console.error('❌ خطأ في فحص تكرار الهاتف:', error);
        return { isDuplicate: false, error: 'خطأ في التحقق من تكرار الهاتف' };
      }
      
      if (data && data.length > 0) {
        console.log('✅ تم العثور على عميل مكرر:', data[0]);
        return { 
          isDuplicate: true, 
          existingCustomer: data[0],
          message: `رقم الهاتف ${phone} مُسجل بالفعل للعميل: ${data[0].name}`
        };
      }
      
      console.log('✅ لا يوجد تكرار للهاتف');
      return { isDuplicate: false };
      
    } catch (error) {
      console.error('❌ خطأ عام في فحص تكرار الهاتف:', error);
      return { isDuplicate: false, error: 'خطأ غير متوقع في التحقق من الهاتف' };
    }
  };

  // فحص تكرار البريد الإلكتروني
  const checkDuplicateEmail = async (email: string, excludeId?: string) => {
    if (!email) return { isDuplicate: false };
    
    try {
      console.log('🔍 فحص تكرار البريد الإلكتروني:', email);
      
      let query = supabase
        .from('customers')
        .select('id, name, email')
        .eq('email', email.toLowerCase().trim());
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query.limit(1);
      
      if (error) {
        console.error('❌ خطأ في فحص تكرار البريد:', error);
        return { isDuplicate: false, error: 'خطأ في التحقق من تكرار البريد الإلكتروني' };
      }
      
      if (data && data.length > 0) {
        return { 
          isDuplicate: true, 
          existingCustomer: data[0],
          message: `البريد الإلكتروني ${email} مُسجل بالفعل للعميل: ${data[0].name}`
        };
      }
      
      return { isDuplicate: false };
      
    } catch (error) {
      console.error('❌ خطأ عام في فحص تكرار البريد:', error);
      return { isDuplicate: false, error: 'خطأ غير متوقع في التحقق من البريد الإلكتروني' };
    }
  };

  // فحص شامل للتكرار
  const checkCustomerDuplication = async (customerData: { 
    phone: string; 
    email?: string; 
    name: string; 
  }, excludeId?: string) => {
    const results = {
      phone: await checkDuplicatePhone(customerData.phone, excludeId),
      email: customerData.email ? await checkDuplicateEmail(customerData.email, excludeId) : { isDuplicate: false }
    };

    // فحص إذا كان هناك أي تكرار
    const hasDuplication = results.phone.isDuplicate || results.email.isDuplicate;
    
    return {
      hasDuplication,
      phoneResult: results.phone,
      emailResult: results.email,
      normalizedPhone: normalizePhoneNumber(customerData.phone)
    };
  };

  return {
    normalizePhoneNumber,
    validatePhoneNumber,
    checkDuplicatePhone,
    checkDuplicateEmail,
    checkCustomerDuplication
  };
};
