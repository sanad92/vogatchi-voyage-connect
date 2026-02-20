
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useUserManagement = () => {
  const [isLoading, setIsLoading] = useState(false);

  const resetUserPassword = async (userId: string, newPassword: string) => {
    try {
      setIsLoading(true);
      console.log('🔄 بدء إعادة تعيين كلمة المرور للمستخدم:', userId);
      
      const { data, error } = await supabase.rpc('admin_reset_user_password' as any, {
        p_user_id: userId,
        p_new_password: newPassword
      });

      if (error) {
        console.error('❌ خطأ في استدعاء admin_reset_user_password:', error);
        throw error;
      }

      const result = data?.[0];
      console.log('📋 نتيجة إعادة تعيين كلمة المرور:', result);
      
      if (!result?.success) {
        throw new Error(result?.message || 'فشل في إعادة تعيين كلمة المرور');
      }

      console.log('✅ تم إعادة تعيين كلمة المرور بنجاح');
      toast.success('تم إعادة تعيين كلمة المرور بنجاح');
      return { success: true };
    } catch (error: any) {
      console.error('❌ خطأ في إعادة تعيين كلمة المرور:', error);
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
      
      // Define valid database roles (excluding no_role)
      const validRoles = ['admin', 'manager', 'sales_agent', 'accountant', 'viewer', 'super_admin'] as const;
      type ValidRole = typeof validRoles[number];
      
      if (!validRoles.includes(userData.role as ValidRole)) {
        console.error('❌ دور المستخدم غير صالح:', userData.role);
        throw new Error('دور المستخدم غير صالح');
      }
      
      // Cast role to the correct type after validation
      const validRole = userData.role as ValidRole;
      console.log('✅ دور المستخدم صالح:', validRole);
      
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
      console.log('🔄 بدء تحديث ملف المستخدم:', userId, updates);
      
      const { data, error } = await supabase.rpc('admin_update_user_profile', {
        p_user_id: userId,
        p_email: updates.email,
        p_full_name: updates.full_name,
        p_department: updates.department,
        p_phone: updates.phone,
        p_is_active: updates.is_active
      });

      if (error) {
        console.error('❌ خطأ في استدعاء admin_update_user_profile:', error);
        throw error;
      }

      const result = data?.[0];
      console.log('📋 نتيجة تحديث ملف المستخدم:', result);
      
      if (!result?.success) {
        throw new Error(result?.message || 'فشل في تحديث ملف المستخدم');
      }

      console.log('✅ تم تحديث ملف المستخدم بنجاح');
      toast.success('تم تحديث ملف المستخدم بنجاح');
      return { success: true };
    } catch (error: any) {
      console.error('❌ خطأ في تحديث ملف المستخدم:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث ملف المستخدم');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    resetUserPassword,
    createUser,
    updateUserProfile,
    isLoading
  };
};
