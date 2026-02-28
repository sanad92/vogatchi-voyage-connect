
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useUserManagement = () => {
  const [isLoading, setIsLoading] = useState(false);

  const resetUserPassword = async (userId: string, newPassword: string) => {
    try {
      setIsLoading(true);

      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'reset_password',
          user_id: userId,
          new_password: newPassword,
        },
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
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

      const validRoles = ['admin', 'manager', 'sales_agent', 'accountant', 'viewer', 'super_admin'] as const;
      if (!validRoles.includes(userData.role as any)) {
        throw new Error('دور المستخدم غير صالح');
      }

      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'create_user',
          email: userData.email,
          password: userData.password,
          full_name: userData.full_name,
          department: userData.department,
          phone: userData.phone,
          role: userData.role,
        },
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.success) {
        throw new Error(result?.message || 'فشل في إنشاء المستخدم');
      }

      toast.success('تم إنشاء المستخدم بنجاح');
      return { success: true, userId: result.user_id };
    } catch (error: any) {
      console.error('خطأ في إنشاء المستخدم:', error);
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

      const { data, error } = await supabase.functions.invoke('admin-user-management', {
        body: {
          action: 'update_profile',
          user_id: userId,
          email: updates.email,
          full_name: updates.full_name,
          department: updates.department,
          phone: updates.phone,
          is_active: updates.is_active,
        },
      });

      if (error) throw error;

      const result = Array.isArray(data) ? data[0] : data;
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
    resetUserPassword,
    createUser,
    updateUserProfile,
    isLoading
  };
};
