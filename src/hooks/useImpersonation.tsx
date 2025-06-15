
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useImpersonation = () => {
  const [isLoading, setIsLoading] = useState(false);

  const loginAsUser = async (userId: string, reason?: string) => {
    try {
      setIsLoading(true);
      console.log('🔄 بدء تسجيل الدخول كمستخدم:', userId, 'السبب:', reason);
      
      const { data, error } = await supabase.rpc('start_impersonation', {
        p_target_user_id: userId,
        p_reason: reason || 'إدارة الحساب'
      });

      if (error) {
        console.error('❌ خطأ في استدعاء start_impersonation:', error);
        throw error;
      }

      const result = data?.[0];
      console.log('📋 نتيجة بدء تسجيل الدخول:', result);
      
      if (!result?.success) {
        throw new Error(result?.message || 'فشل في بدء عملية تسجيل الدخول');
      }

      // Store the impersonation session
      localStorage.setItem('admin_impersonation_session', result.session_token);
      localStorage.setItem('admin_original_user', JSON.stringify({
        id: (await supabase.auth.getUser()).data.user?.id,
        session_token: result.session_token
      }));

      console.log('✅ تم بدء تسجيل الدخول بنجاح');
      toast.success('تم بدء تسجيل الدخول كمستخدم بنجاح');
      
      // Redirect to main page as the impersonated user
      window.location.href = '/';
      
      return { success: true };
    } catch (error: any) {
      console.error('❌ خطأ في تسجيل الدخول كمستخدم:', error);
      toast.error(error.message || 'حدث خطأ أثناء تسجيل الدخول');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const endImpersonation = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 بدء إنهاء تسجيل الدخول');
      
      const sessionToken = localStorage.getItem('admin_impersonation_session');
      console.log('🔍 فحص session token:', sessionToken ? 'موجود' : 'غير موجود');
      
      if (!sessionToken) {
        console.warn('⚠️ لا توجد جلسة تسجيل دخول نشطة');
        throw new Error('لا توجد جلسة تسجيل دخول نشطة');
      }

      console.log('📤 إرسال طلب إنهاء تسجيل الدخول...');
      const { data, error } = await supabase.rpc('end_impersonation', {
        p_session_id: sessionToken
      });

      console.log('📥 استجابة إنهاء تسجيل الدخول:', { data, error });

      if (error) {
        console.error('❌ خطأ في استدعاء end_impersonation:', error);
        
        // في حالة خطأ الدالة، نقوم بتنظيف البيانات المحلية على أي حال
        console.log('🧹 تنظيف البيانات المحلية بسبب الخطأ...');
        localStorage.removeItem('admin_impersonation_session');
        localStorage.removeItem('admin_original_user');
        
        // إظهار الخطأ للمستخدم
        toast.error(`خطأ في إنهاء الجلسة: ${error.message}`);
        
        // إعادة التوجيه حتى في حالة الخطأ
        console.log('🔄 إعادة التوجيه للوحة التحكم...');
        setTimeout(() => {
          window.location.href = '/admin';
        }, 2000);
        
        return { success: false, error: error.message };
      }

      const result = data?.[0];
      console.log('📋 نتيجة إنهاء تسجيل الدخول:', result);
      
      if (!result?.success) {
        console.warn('⚠️ فشل في إنهاء العملية:', result?.message);
        
        // حتى لو فشلت الدالة، نقوم بتنظيف البيانات المحلية
        console.log('🧹 تنظيف البيانات المحلية رغم الفشل...');
        localStorage.removeItem('admin_impersonation_session');
        localStorage.removeItem('admin_original_user');
        
        toast.warning(result?.message || 'تم إنهاء الجلسة المحلية');
        
        // إعادة التوجيه
        setTimeout(() => {
          window.location.href = '/admin';
        }, 1500);
        
        return { success: false, error: result?.message };
      }

      // تنظيف البيانات المحلية بعد النجاح
      console.log('🧹 تنظيف البيانات المحلية بعد النجاح...');
      localStorage.removeItem('admin_impersonation_session');
      localStorage.removeItem('admin_original_user');

      console.log('✅ تم إنهاء تسجيل الدخول بنجاح');
      toast.success('تم إنهاء عملية تسجيل الدخول بنجاح');
      
      // إعادة التوجيه للوحة الإدارة
      console.log('🔄 إعادة التوجيه للوحة التحكم...');
      window.location.href = '/admin';
      
      return { success: true };
    } catch (error: any) {
      console.error('💥 خطأ عام في إنهاء تسجيل الدخول:', error);
      
      // تنظيف البيانات المحلية في جميع الحالات
      console.log('🧹 تنظيف البيانات المحلية بسبب الخطأ العام...');
      localStorage.removeItem('admin_impersonation_session');
      localStorage.removeItem('admin_original_user');
      
      toast.error(error.message || 'حدث خطأ أثناء إنهاء تسجيل الدخول');
      
      // إعادة التوجيه حتى في حالة الخطأ
      console.log('🔄 إعادة التوجيه للوحة التحكم بسبب الخطأ...');
      setTimeout(() => {
        window.location.href = '/admin';
      }, 3000);
      
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    loginAsUser,
    endImpersonation,
    isLoading
  };
};
