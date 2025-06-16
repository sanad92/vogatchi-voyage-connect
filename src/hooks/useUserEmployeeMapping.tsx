
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export const useUserEmployeeMapping = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // جلب بيانات الموظف المرتبط بالمستخدم الحالي
  const fetchCurrentEmployee = async () => {
    if (!user?.id) {
      setIsLoading(false);
      setCurrentEmployee(null);
      setError(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🔄 جلب بيانات الموظف المرتبط للمستخدم:', user.email);
      
      // جلب بيانات المستخدم مع الموظف المرتبط
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          employees(*)
        `)
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile with employee:', profileError);
        setError('خطأ في جلب بيانات المستخدم');
        return;
      }

      // إذا كان هناك موظف مرتبط، استخدمه
      if (profileData?.employees) {
        console.log('✅ تم العثور على موظف مرتبط:', profileData.employees);
        setCurrentEmployee(profileData.employees);
        setError(null);
      } else {
        console.log('⚠️ لا يوجد موظف مرتبط - البحث بالبريد الإلكتروني...');
        
        // البحث عن موظف بنفس البريد الإلكتروني
        if (user.email) {
          const { data: employeeData, error: employeeError } = await supabase
            .from('employees')
            .select('*')
            .eq('email', user.email)
            .eq('is_active', true)
            .maybeSingle();

          if (!employeeError && employeeData) {
            console.log('✅ تم العثور على موظف بنفس البريد الإلكتروني:', employeeData);
            setCurrentEmployee(employeeData);
            setError(null);
            
            // محاولة ربط تلقائي باستخدام الـ function المحسن
            try {
              const { data: linkResult, error: linkError } = await supabase.rpc('link_user_to_employee', {
                p_user_id: user.id,
                p_employee_id: employeeData.id
              });
              
              if (!linkError && linkResult) {
                console.log('✅ تم الربط التلقائي بنجاح');
                toast.success('تم ربط حسابك بملف الموظف تلقائياً');
                // تحديث البيانات
                queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
                queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
              }
            } catch (linkError) {
              console.warn('تحذير: فشل الربط التلقائي:', linkError);
            }
          } else {
            console.log('⚠️ لم يتم العثور على موظف بنفس البريد الإلكتروني');
            setCurrentEmployee(null);
            setError(null);
          }
        }
      }
    } catch (error) {
      console.error('Error in fetchCurrentEmployee:', error);
      setError('حدث خطأ في جلب بيانات الموظف');
      setCurrentEmployee(null);
    } finally {
      setIsLoading(false);
    }
  };

  // ربط مستخدم بموظف باستخدام الـ function المحسن
  const linkUserToEmployee = async (employeeId: string) => {
    if (!user?.id) {
      toast.error('المستخدم غير مسجل الدخول');
      return false;
    }

    try {
      console.log('🔄 بدء ربط المستخدم بالموظف:', { userId: user.id, employeeId });
      
      const { data, error } = await supabase.rpc('link_user_to_employee', {
        p_user_id: user.id,
        p_employee_id: employeeId
      });

      if (error || !data) {
        console.error('Error linking user to employee:', error);
        toast.error('فشل في ربط المستخدم بالموظف: ' + (error?.message || 'خطأ غير معروف'));
        return false;
      }

      console.log('✅ تم ربط المستخدم بالموظف بنجاح');
      toast.success('تم ربط المستخدم بالموظف بنجاح');
      
      // تحديث البيانات المحلية والـ cache
      await fetchCurrentEmployee();
      
      // تحديث جميع الـ queries المتعلقة
      queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      
      return true;
    } catch (error) {
      console.error('Error in linkUserToEmployee:', error);
      toast.error('حدث خطأ أثناء ربط المستخدم بالموظف');
      return false;
    }
  };

  // الحصول على اسم الموظف الحالي
  const getCurrentEmployeeName = () => {
    return currentEmployee?.full_name || user?.email || 'مستخدم غير محدد';
  };

  // الحصول على معرف الموظف الحالي
  const getCurrentEmployeeId = () => {
    return currentEmployee?.id || null;
  };

  useEffect(() => {
    fetchCurrentEmployee();
  }, [user?.id]);

  return {
    currentEmployee,
    isLoading,
    error,
    linkUserToEmployee,
    getCurrentEmployeeName,
    getCurrentEmployeeId,
    refetchCurrentEmployee: fetchCurrentEmployee
  };
};
