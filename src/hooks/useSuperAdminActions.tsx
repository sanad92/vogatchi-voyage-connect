
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserRole } from "@/types/userManagement";

export const useSuperAdminActions = () => {
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

  const resetUserPassword = async (userId: string, newPassword: string) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.rpc('admin_reset_user_password', {
        p_user_id: userId,
        p_new_password: newPassword
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'فشل في إعادة تعيين كلمة المرور');
      }

      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
      return { success: true };
    } catch (error: any) {
      console.error('خطأ في إعادة تعيين كلمة المرور:', error);
      toast.error(error.message || 'حدث خطأ أثناء إعادة تعيين كلمة المرور');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const createUser = async (userData: {
    email: string;
    password: string;
    full_name: string;
    department?: string;
    phone?: string;
    role: string;
  }) => {
    try {
      setIsLoading(true);
      console.log('🔄 بدء إنشاء مستخدم جديد:', userData.email);
      
      // Filter out 'no_role' and only pass valid roles to the RPC function
      const validRoles = ['admin', 'manager', 'sales_agent', 'accountant', 'viewer', 'super_admin'];
      
      if (!validRoles.includes(userData.role)) {
        throw new Error('دور المستخدم غير صالح');
      }
      
      // Cast role to the correct type after validation
      const validRole = userData.role as "admin" | "manager" | "sales_agent" | "accountant" | "viewer" | "super_admin";
      
      const { data, error } = await supabase.rpc('admin_create_user', {
        p_email: userData.email,
        p_password: userData.password,
        p_full_name: userData.full_name,
        p_department: userData.department,
        p_phone: userData.phone,
        p_role: validRole
      });

      if (error) {
        console.error('❌ خطأ في استدعاء admin_create_user:', error);
        throw error;
      }

      const result = data?.[0];
      console.log('📋 نتيجة إنشاء المستخدم:', result);
      
      if (!result?.success) {
        throw new Error(result?.message || 'فشل في إنشاء المستخدم');
      }

      console.log('✅ تم إنشاء المستخدم بنجاح:', result.user_id);
      toast.success('تم إنشاء المستخدم بنجاح');
      return { success: true, userId: result.user_id };
    } catch (error: any) {
      console.error('❌ خطأ في إنشاء المستخدم:', error);
      toast.error(error.message || 'حدث خطأ أثناء إنشاء المستخدم');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (userId: string, updates: {
    email?: string;
    full_name?: string;
    department?: string;
    phone?: string;
    is_active?: boolean;
  }) => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase.rpc('admin_update_user_profile', {
        p_user_id: userId,
        p_email: updates.email,
        p_full_name: updates.full_name,
        p_department: updates.department,
        p_phone: updates.phone,
        p_is_active: updates.is_active
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result?.success) {
        throw new Error(result?.message || 'فشل في تحديث ملف المستخدم');
      }

      toast.success('تم تحديث ملف المستخدم بنجاح');
      return { success: true };
    } catch (error: any) {
      console.error('خطأ في تحديث ملف المستخدم:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث ملف المستخدم');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    loginAsUser,
    endImpersonation,
    resetUserPassword,
    createUser,
    updateUserProfile,
    isLoading
  };
};
