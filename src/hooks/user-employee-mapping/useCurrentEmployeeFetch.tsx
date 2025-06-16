
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '../useAuth';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import type { CurrentEmployeeData } from './types';
import type { LinkUserToEmployeeResponse } from '../unified-data/types';

export const useCurrentEmployeeFetch = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentEmployee, setCurrentEmployee] = useState<CurrentEmployeeData | null>(null);
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
            
            // محاولة ربط تلقائي باستخدام الدالة المحسنة
            try {
              const { data: linkResult, error: linkError } = await supabase.rpc('link_user_to_employee', {
                p_user_id: user.id,
                p_employee_id: employeeData.id
              });
              
              const response = linkResult as unknown as LinkUserToEmployeeResponse;
              
              if (!linkError && response?.success) {
                console.log('✅ تم الربط التلقائي بنجاح:', response);
                toast.success(response.message || 'تم ربط حسابك بملف الموظف تلقائياً');
                queryClient.invalidateQueries({ queryKey: ['unified-users-employees-all'] });
                queryClient.invalidateQueries({ queryKey: ['unlinked-employees-all'] });
              } else {
                console.warn('تحذير: فشل الربط التلقائي:', response);
                if (response?.message) {
                  toast.warning(`تحذير: ${response.message}`);
                }
              }
            } catch (linkError) {
              console.warn('تحذير: خطأ في الربط التلقائي:', linkError);
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

  useEffect(() => {
    fetchCurrentEmployee();
  }, [user?.id]);

  return {
    currentEmployee,
    isLoading,
    error,
    fetchCurrentEmployee
  };
};
