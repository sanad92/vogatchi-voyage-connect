
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { LinkUserToEmployeeResponse } from './unified-data/types';

export const useUnifiedUserEmployee = () => {
  const queryClient = useQueryClient();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateUnifiedData = async (data: {
    userId: string;
    userData: any;
    employeeData?: any;
  }) => {
    try {
      setIsUpdating(true);
      console.log('🔄 بدء تحديث البيانات الموحدة:', data);
      
      // تحديث بيانات المستخدم
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: data.userData.full_name,
          email: data.userData.email,
          phone: data.userData.phone,
          department: data.userData.department,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.userId);

      if (profileError) {
        console.error('❌ خطأ في تحديث ملف المستخدم:', profileError);
        throw new Error('فشل في تحديث بيانات المستخدم');
      }

      // تحديث بيانات الموظف إذا كانت موجودة
      if (data.employeeData) {
        // الحصول على معرف الموظف المرتبط
        const { data: profileData, error: profileFetchError } = await supabase
          .from('profiles')
          .select('employee_id')
          .eq('id', data.userId)
          .single();

        if (profileFetchError) {
          console.error('❌ خطأ في جلب معرف الموظف:', profileFetchError);
          throw new Error('فشل في جلب معرف الموظف');
        }

        if (profileData?.employee_id) {
          const { error: employeeError } = await supabase
            .from('employees')
            .update({
              position: data.employeeData.position,
              base_salary: data.employeeData.base_salary,
              allowances: data.employeeData.allowances,
              commission_rate: data.employeeData.commission_rate,
              bank_name: data.employeeData.bank_name,
              bank_account_number: data.employeeData.bank_account_number,
              national_id: data.employeeData.national_id,
              emergency_contact_name: data.employeeData.emergency_contact_name,
              emergency_contact_phone: data.employeeData.emergency_contact_phone,
              updated_at: new Date().toISOString()
            })
            .eq('id', profileData.employee_id);

          if (employeeError) {
            console.error('❌ خطأ في تحديث بيانات الموظف:', employeeError);
            throw new Error('فشل في تحديث بيانات الموظف');
          }
        }
      }

      console.log('✅ تم تحديث البيانات الموحدة بنجاح');
      
      // تحديث الـ cache
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      
      toast.success('تم تحديث البيانات بنجاح');
      
    } catch (error: any) {
      console.error('❌ خطأ في تحديث البيانات الموحدة:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث البيانات');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  const linkUserToEmployee = async (userId: string, employeeId: string) => {
    try {
      setIsUpdating(true);
      console.log('🔗 بدء ربط المستخدم بالموظف:', { userId, employeeId });
      
      const { data, error } = await supabase.rpc('link_user_to_employee', {
        p_user_id: userId,
        p_employee_id: employeeId
      });

      if (error) {
        console.error('❌ خطأ في استدعاء دالة الربط:', error);
        throw new Error(error.message || 'خطأ في الاتصال بقاعدة البيانات');
      }

      const response = data as unknown as LinkUserToEmployeeResponse;

      if (!response?.success) {
        const errorMessage = response?.message || 'فشل في ربط المستخدم بالموظف';
        console.error('❌ فشل في ربط المستخدم:', response);
        
        switch (response?.error) {
          case 'USER_NOT_FOUND':
            throw new Error('المستخدم غير موجود في النظام');
          case 'EMPLOYEE_NOT_FOUND':
            throw new Error('الموظف غير موجود في النظام');
          case 'EMPLOYEE_INACTIVE':
            throw new Error('الموظف غير نشط حالياً');
          case 'EMPLOYEE_ALREADY_LINKED':
            throw new Error('هذا الموظف مرتبط بمستخدم آخر بالفعل');
          case 'UPDATE_FAILED':
            throw new Error('فشل في تحديث بيانات المستخدم');
          default:
            throw new Error(errorMessage);
        }
      }

      console.log('✅ تم ربط المستخدم بالموظف بنجاح');
      
      // تحديث الـ cache
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      
      toast.success(response.message || 'تم ربط المستخدم بالموظف بنجاح');
      
      return response;
      
    } catch (error: any) {
      console.error('❌ خطأ في ربط المستخدم بالموظف:', error);
      toast.error(error.message || 'حدث خطأ أثناء ربط المستخدم بالموظف');
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateUnifiedData,
    linkUserToEmployee,
    isUpdating
  };
};
