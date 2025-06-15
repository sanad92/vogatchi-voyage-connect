
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useUserEmployeeMapping = () => {
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // جلب بيانات الموظف المرتبط بالمستخدم الحالي
  const fetchCurrentEmployee = async () => {
    if (!user?.email) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('email', user.email)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching employee:', error);
        return;
      }

      setCurrentEmployee(data);
    } catch (error) {
      console.error('Error in fetchCurrentEmployee:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ربط مستخدم بموظف
  const linkUserToEmployee = async (employeeId: string) => {
    if (!user?.email) {
      toast.error('المستخدم غير مسجل الدخول');
      return false;
    }

    try {
      const { error } = await supabase
        .from('employees')
        .update({ email: user.email })
        .eq('id', employeeId);

      if (error) {
        console.error('Error linking user to employee:', error);
        toast.error('فشل في ربط المستخدم بالموظف');
        return false;
      }

      toast.success('تم ربط المستخدم بالموظف بنجاح');
      await fetchCurrentEmployee();
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
  }, [user?.email]);

  return {
    currentEmployee,
    isLoading,
    linkUserToEmployee,
    getCurrentEmployeeName,
    getCurrentEmployeeId,
    refetchCurrentEmployee: fetchCurrentEmployee
  };
};
