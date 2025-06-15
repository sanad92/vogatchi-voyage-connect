
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface CurrentEmployee {
  id: string;
  full_name: string;
  employee_code: string;
  email: string;
  position?: string;
  is_active: boolean;
}

export const useCurrentEmployee = () => {
  const { user } = useAuth();
  const [currentEmployee, setCurrentEmployee] = useState<CurrentEmployee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentEmployee = async () => {
      if (!user?.email) {
        setCurrentEmployee(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // البحث عن الموظف بالبريد الإلكتروني
        const { data: employee, error: employeeError } = await supabase
          .from('employees')
          .select('id, full_name, employee_code, email, position, is_active')
          .eq('email', user.email)
          .eq('is_active', true)
          .single();

        if (employeeError) {
          if (employeeError.code === 'PGRST116') {
            // لا يوجد موظف مطابق - استخدم بيانات المستخدم
            setCurrentEmployee({
              id: user.id,
              full_name: user.email.split('@')[0],
              employee_code: 'USER',
              email: user.email,
              is_active: true
            });
          } else {
            throw employeeError;
          }
        } else {
          setCurrentEmployee(employee);
        }
      } catch (err) {
        console.error('Error fetching current employee:', err);
        setError('حدث خطأ في جلب بيانات الموظف');
        // fallback لبيانات المستخدم
        if (user?.email) {
          setCurrentEmployee({
            id: user.id,
            full_name: user.email.split('@')[0],
            employee_code: 'USER',
            email: user.email,
            is_active: true
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCurrentEmployee();
  }, [user?.email, user?.id]);

  return {
    currentEmployee,
    isLoading,
    error,
    // دوال مساعدة
    getCurrentEmployeeName: () => currentEmployee?.full_name || user?.email || 'مستخدم غير محدد',
    getCurrentEmployeeId: () => currentEmployee?.id || user?.id || null,
  };
};
