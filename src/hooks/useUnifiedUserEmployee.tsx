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
      
      // التحقق من صحة البيانات قبل الإرسال
      if (!data.userId) {
        throw new Error('معرف المستخدم مطلوب');
      }
      
      if (!data.userData) {
        throw new Error('بيانات المستخدم مطلوبة');
      }
      
      // التحقق من البيانات المطلوبة
      const requiredFields = ['full_name'];
      for (const field of requiredFields) {
        if (!data.userData[field] || data.userData[field].trim() === '') {
          throw new Error(`الحقل ${field} مطلوب ولا يمكن أن يكون فارغاً`);
        }
      }
      
      console.log('✅ تم التحقق من صحة البيانات');
      
      // التحقق من وجود المستخدم أولاً
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, employee_id, email')
        .eq('id', data.userId)
        .single();
      
      if (checkError) {
        console.error('❌ خطأ في التحقق من وجود المستخدم:', checkError);
        throw new Error('فشل في التحقق من وجود المستخدم: ' + checkError.message);
      }
      
      if (!existingProfile) {
        throw new Error('المستخدم غير موجود في النظام');
      }
      
      console.log('✅ تم العثور على المستخدم:', existingProfile);
      
      // إعداد بيانات التحديث للمستخدم (بدون email إذا لم يتغير)
      const profileUpdateData: any = {
        full_name: data.userData.full_name.trim(),
        phone: data.userData.phone?.trim() || null,
        department: data.userData.department?.trim() || null,
        updated_at: new Date().toISOString()
      };
      
      // إضافة email فقط إذا تغير وكان صالحاً
      if (data.userData.email && data.userData.email.trim() !== existingProfile.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.userData.email.trim())) {
          throw new Error('صيغة البريد الإلكتروني غير صحيحة');
        }
        profileUpdateData.email = data.userData.email.trim();
      }
      
      console.log('🔄 تحديث بيانات المستخدم:', profileUpdateData);
      
      // تحديث بيانات المستخدم
      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdateData)
        .eq('id', data.userId);

      if (profileError) {
        console.error('❌ خطأ في تحديث ملف المستخدم:', profileError);
        
        // رسائل خطأ مخصصة حسب نوع الخطأ
        let errorMessage = 'فشل في تحديث بيانات المستخدم';
        if (profileError.code === '23505') {
          errorMessage = 'البريد الإلكتروني مستخدم بالفعل من قبل مستخدم آخر';
        } else if (profileError.code === '23502') {
          errorMessage = 'بعض الحقول المطلوبة فارغة';
        } else if (profileError.code === '42501') {
          errorMessage = 'ليس لديك صلاحية لتحديث هذا المستخدم';
        } else {
          errorMessage = `خطأ في قاعدة البيانات: ${profileError.message}`;
        }
        
        throw new Error(errorMessage);
      }

      console.log('✅ تم تحديث بيانات المستخدم بنجاح');

      // تحديث بيانات الموظف إذا كانت موجودة
      if (data.employeeData && existingProfile.employee_id) {
        console.log('🔄 تحديث بيانات الموظف:', data.employeeData);
        
        // التحقق من صحة بيانات الموظف
        const employeeUpdateData: any = {
          updated_at: new Date().toISOString()
        };
        
        // إضافة الحقول فقط إذا كانت موجودة وصحيحة
        if (data.employeeData.position?.trim()) {
          employeeUpdateData.position = data.employeeData.position.trim();
        }
        
        if (typeof data.employeeData.base_salary === 'number' && data.employeeData.base_salary >= 0) {
          employeeUpdateData.base_salary = data.employeeData.base_salary;
        }
        
        if (typeof data.employeeData.allowances === 'number' && data.employeeData.allowances >= 0) {
          employeeUpdateData.allowances = data.employeeData.allowances;
        }
        
        if (typeof data.employeeData.commission_rate === 'number' && data.employeeData.commission_rate >= 0) {
          employeeUpdateData.commission_rate = data.employeeData.commission_rate;
        }
        
        if (data.employeeData.bank_name?.trim()) {
          employeeUpdateData.bank_name = data.employeeData.bank_name.trim();
        }
        
        if (data.employeeData.bank_account_number?.trim()) {
          employeeUpdateData.bank_account_number = data.employeeData.bank_account_number.trim();
        }
        
        if (data.employeeData.national_id?.trim()) {
          employeeUpdateData.national_id = data.employeeData.national_id.trim();
        }
        
        if (data.employeeData.emergency_contact_name?.trim()) {
          employeeUpdateData.emergency_contact_name = data.employeeData.emergency_contact_name.trim();
        }
        
        if (data.employeeData.emergency_contact_phone?.trim()) {
          employeeUpdateData.emergency_contact_phone = data.employeeData.emergency_contact_phone.trim();
        }
        
        console.log('📋 بيانات تحديث الموظف المعدة:', employeeUpdateData);
        
        // تحديث بيانات الموظف
        const { error: employeeError } = await supabase
          .from('employees')
          .update(employeeUpdateData)
          .eq('id', existingProfile.employee_id);

        if (employeeError) {
          console.error('❌ خطأ في تحديث بيانات الموظف:', employeeError);
          
          // رسائل خطأ مخصصة للموظف
          let employeeErrorMessage = 'فشل في تحديث بيانات الموظف';
          if (employeeError.code === '23505') {
            employeeErrorMessage = 'بعض بيانات الموظف مكررة (مثل الرقم القومي)';
          } else if (employeeError.code === '42501') {
            employeeErrorMessage = 'ليس لديك صلاحية لتحديث بيانات الموظف';
          } else {
            employeeErrorMessage = `خطأ في تحديث بيانات الموظف: ${employeeError.message}`;
          }
          
          throw new Error(employeeErrorMessage);
        }
        
        console.log('✅ تم تحديث بيانات الموظف بنجاح');
      }

      console.log('✅ تم تحديث البيانات الموحدة بنجاح');
      
      // تحديث الـ cache
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      
      toast.success('تم تحديث البيانات بنجاح');
      
    } catch (error: any) {
      console.error('❌ خطأ في تحديث البيانات الموحدة:', error);
      
      // رسالة خطأ مفصلة للمستخدم
      const userMessage = error.message || 'حدث خطأ أثناء تحديث البيانات';
      
      // إضافة معلومات إضافية للتشخيص
      if (error.code) {
        console.error('🔍 كود الخطأ:', error.code);
      }
      if (error.details) {
        console.error('🔍 تفاصيل الخطأ:', error.details);
      }
      if (error.hint) {
        console.error('🔍 اقتراح:', error.hint);
      }
      
      toast.error(userMessage);
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
