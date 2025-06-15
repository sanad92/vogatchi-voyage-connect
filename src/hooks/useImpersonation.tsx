
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useImpersonation = () => {
  const [isLoading, setIsLoading] = useState(false);

  const loginAsUser = async (userId: string, reason?: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.rpc('start_impersonation', {
        p_target_user_id: userId,
        p_reason: reason || 'إدارة الحساب'
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'فشل في بدء عملية تسجيل الدخول');
      }

      // Store the impersonation session
      localStorage.setItem('admin_impersonation_session', result.session_token);
      localStorage.setItem('admin_original_user', JSON.stringify({
        id: (await supabase.auth.getUser()).data.user?.id,
        session_token: result.session_token
      }));

      toast.success('تم بدء تسجيل الدخول كمستخدم بنجاح');
      
      // Redirect to main page as the impersonated user
      window.location.href = '/';
      
      return { success: true };
    } catch (error: any) {
      console.error('خطأ في تسجيل الدخول كمستخدم:', error);
      toast.error(error.message || 'حدث خطأ أثناء تسجيل الدخول');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const endImpersonation = async () => {
    try {
      setIsLoading(true);
      
      const sessionToken = localStorage.getItem('admin_impersonation_session');
      if (!sessionToken) {
        throw new Error('لا توجد جلسة تسجيل دخول نشطة');
      }

      const { data, error } = await supabase.rpc('end_impersonation', {
        p_session_id: sessionToken
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'فشل في إنهاء عملية تسجيل الدخول');
      }

      // Clear impersonation data
      localStorage.removeItem('admin_impersonation_session');
      localStorage.removeItem('admin_original_user');

      toast.success('تم إنهاء عملية تسجيل الدخول بنجاح');
      
      // Redirect back to admin panel
      window.location.href = '/admin';
      
      return { success: true };
    } catch (error: any) {
      console.error('خطأ في إنهاء تسجيل الدخول:', error);
      toast.error(error.message || 'حدث خطأ أثناء إنهاء تسجيل الدخول');
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
