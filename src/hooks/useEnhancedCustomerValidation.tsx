
import { supabase } from "@/integrations/supabase/client";

export const useEnhancedCustomerValidation = () => {
  // تنسيق رقم الهاتف لجعله موحد - نسخة محسنة
  const normalizePhoneNumber = (phone: string): string => {
    if (!phone) return '';
    
    console.log('🔧 تنسيق الرقم الأصلي:', phone);
    
    // إزالة جميع المسافات والرموز
    let normalized = phone.replace(/[\s\-\(\)\+]/g, '');
    
    console.log('🔧 بعد إزالة الرموز:', normalized);
    
    // معالجة الأرقام المصرية بجميع الصيغ
    if (normalized.match(/^201[0-9]{9}$/)) {
      // الرقم بالفعل بصيغة 201xxxxxxxxx
      console.log('✅ الرقم بصيغة 201 بالفعل');
      return normalized;
    }
    
    if (normalized.match(/^01[0-9]{9}$/)) {
      // الرقم بصيغة 01xxxxxxxxx - تحويل إلى 201xxxxxxxxx
      normalized = '20' + normalized.substring(1);
      console.log('🔄 تحويل من 01 إلى 201:', normalized);
      return normalized;
    }
    
    if (normalized.match(/^1[0-9]{9}$/)) {
      // الرقم بصيغة 1xxxxxxxxx - إضافة 20
      normalized = '20' + normalized;
      console.log('🔄 إضافة 20 للرقم:', normalized);
      return normalized;
    }
    
    // إذا كان الرقم يبدأ بـ 0 وليس 01، قم بإزالة الصفر
    if (normalized.startsWith('0') && !normalized.startsWith('01')) {
      normalized = normalized.substring(1);
      console.log('🔄 إزالة الصفر من البداية:', normalized);
    }
    
    // إذا كان الرقم 10 أرقام ولا يبدأ بـ 20، أضف 20
    if (normalized.length === 10 && !normalized.startsWith('20')) {
      normalized = '20' + normalized;
      console.log('🔄 إضافة 20 للرقم ذو الـ 10 أرقام:', normalized);
    }
    
    console.log('✨ الرقم النهائي المنسق:', normalized);
    return normalized;
  };

  // إنشاء جميع الصيغ المحتملة للرقم
  const generatePhoneVariants = (phone: string): string[] => {
    if (!phone) return [];
    
    const normalized = normalizePhoneNumber(phone);
    const variants = new Set<string>();
    
    // إضافة الرقم المنسق
    variants.add(normalized);
    
    // إضافة الرقم الأصلي
    variants.add(phone);
    
    // إذا كان الرقم المنسق يبدأ بـ 201، أضف الصيغ الأخرى
    if (normalized.startsWith('201')) {
      const localNumber = normalized.substring(2); // إزالة 20
      
      // صيغة 01xxxxxxxxx
      variants.add('0' + localNumber);
      
      // صيغة 1xxxxxxxxx
      variants.add(localNumber);
      
      // صيغة +201xxxxxxxxx
      variants.add('+' + normalized);
      
      // صيغة +20 1xxxxxxxxx (مع مسافة)
      variants.add('+20 ' + localNumber);
    }
    
    const result = Array.from(variants).filter(v => v.length >= 10);
    console.log('🔍 صيغ الرقم المختلفة:', result);
    return result;
  };

  // التحقق من صحة رقم الهاتف
  const validatePhoneNumber = (phone: string): { isValid: boolean; message?: string } => {
    if (!phone) {
      return { isValid: false, message: 'رقم الهاتف مطلوب' };
    }

    const normalized = normalizePhoneNumber(phone);
    
    // فحص الأرقام المصرية
    if (normalized.match(/^201[0-9]{9}$/)) {
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

  // فحص تكرار رقم الهاتف مع تحسينات - نسخة محسنة
  const checkDuplicatePhone = async (phone: string, excludeId?: string) => {
    if (!phone) return { isDuplicate: false };
    
    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.isValid) {
      return { isDuplicate: false, error: phoneValidation.message };
    }

    // إنشاء جميع الصيغ المحتملة للرقم
    const phoneVariants = generatePhoneVariants(phone);
    
    try {
      console.log('🔍 فحص تكرار للصيغ التالية:', phoneVariants);
      
      // البحث عن جميع الصيغ المحتملة
      let query = supabase
        .from('customers')
        .select('id, name, phone')
        .or(phoneVariants.map(variant => `phone.eq.${variant}`).join(','));
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query.limit(5); // زيادة الحد للتأكد من العثور على جميع التكرارات
      
      if (error) {
        console.error('❌ خطأ في فحص تكرار الهاتف:', error);
        return { isDuplicate: false, error: 'خطأ في التحقق من تكرار الهاتف' };
      }
      
      if (data && data.length > 0) {
        console.log('⚠️ تم العثور على عملاء مكررين:', data);
        const existingCustomer = data[0];
        return { 
          isDuplicate: true, 
          existingCustomer,
          message: `رقم الهاتف ${phone} مُسجل بالفعل للعميل: ${existingCustomer.name} (${existingCustomer.phone})`,
          duplicateCount: data.length,
          allDuplicates: data
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

    // فحص إذا كان هناك أي تكرار - التأكد من أن النتائج كائنات صحيحة
    const phoneHasDuplicate = typeof results.phone === 'object' && 'isDuplicate' in results.phone && results.phone.isDuplicate;
    const emailHasDuplicate = typeof results.email === 'object' && 'isDuplicate' in results.email && results.email.isDuplicate;
    const hasDuplication = phoneHasDuplicate || emailHasDuplicate;
    
    return {
      hasDuplication,
      phoneResult: results.phone,
      emailResult: results.email,
      normalizedPhone: normalizePhoneNumber(customerData.phone)
    };
  };

  return {
    normalizePhoneNumber,
    generatePhoneVariants,
    validatePhoneNumber,
    checkDuplicatePhone,
    checkDuplicateEmail,
    checkCustomerDuplication
  };
};
