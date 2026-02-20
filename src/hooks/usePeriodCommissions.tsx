
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// تعريف نوع فترة العمولة
interface EmployeeCommissionPeriod {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  total_bookings_count: number;
  total_booking_amount: number;
  total_supplier_cost: number;
  total_profit: number;
  commission_rate: number;
  commission_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'cancelled';
  payment_date?: string;
  payment_method?: string;
  bank_account_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  employee?: {
    full_name: string;
    employee_code: string;
  };
}

// تعريف نوع تفاصيل حجز للفترة
interface BookingProfitDetail {
  booking_type: string;
  booking_id: string;
  booking_amount: number;
  supplier_cost: number;
  profit: number;
  booking_date: string;
}

// تعريف نوع استجابة الدالة
interface DatabaseFunctionResponse {
  success: boolean;
  message: string;
  error?: string;
  commission_period_id?: string;
  summary?: {
    bookings_count: number;
    total_profit: number;
    commission_amount: number;
    commission_rate: number;
  };
  old_status?: string;
  new_status?: string;
}

export const usePeriodCommissions = () => {
  const queryClient = useQueryClient();

  // جلب كل فترات العمولات
  const { data: commissionPeriods, isLoading: periodsLoading, error: periodsError } = useQuery({
    queryKey: ['commission-periods'],
    queryFn: async () => {
      console.log('Fetching commission periods...');
      const { data, error } = await supabase
        .from('employee_commission_periods')
        .select(`
          *,
          employee:employees(full_name, employee_code)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching commission periods:', error);
        throw error;
      }
      console.log('Fetched commission periods:', data);
      return data as EmployeeCommissionPeriod[];
    },
  });

  // جلب تفاصيل الحجوزات لموظف في فترة معينة
  const getEmployeeBookingsProfit = (employeeId: string, periodStart: string, periodEnd: string) => {
    return useQuery({
      queryKey: ['employee-bookings-profit', employeeId, periodStart, periodEnd],
      queryFn: async () => {
        console.log('Fetching employee bookings profit:', { employeeId, periodStart, periodEnd });
        const { data, error } = await supabase.rpc('calculate_employee_bookings_profit' as any, {
          p_employee_id: employeeId,
          p_period_start: periodStart,
          p_period_end: periodEnd
        });

        if (error) {
          console.error('Error fetching bookings profit:', error);
          throw error;
        }
        console.log('Fetched bookings profit:', data);
        return data as unknown as BookingProfitDetail[];
      },
      enabled: !!employeeId && !!periodStart && !!periodEnd,
    });
  };

  // إنشاء عمولة مجمعة جديدة
  const generatePeriodCommissionMutation = useMutation({
    mutationFn: async ({
      employeeId,
      periodStart,
      periodEnd,
      notes
    }: {
      employeeId: string;
      periodStart: string;
      periodEnd: string;
      notes?: string;
    }) => {
      console.log('Generating period commission:', { employeeId, periodStart, periodEnd, notes });
      
      if (!employeeId || !periodStart || !periodEnd) {
        throw new Error('بيانات غير مكتملة لحساب العمولة');
      }

      const { data, error } = await supabase.rpc('generate_period_commission' as any, {
        p_employee_id: employeeId,
        p_period_start: periodStart,
        p_period_end: periodEnd,
        p_notes: notes
      });

      if (error) {
        console.error('Error generating period commission:', error);
        throw error;
      }

      // التعامل مع استجابة الدالة بطريقة آمنة
      let response: DatabaseFunctionResponse;
      
      try {
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
          response = data as unknown as DatabaseFunctionResponse;
        } else {
          throw new Error('استجابة غير متوقعة من الخادم');
        }
        
        if (!response.success) {
          throw new Error(response.message || 'حدث خطأ في حساب العمولة');
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('حدث خطأ في معالجة الاستجابة من الخادم');
      }

      console.log('Generated period commission:', response);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['commission-periods'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success(data?.message || 'تم حساب العمولة المجمعة بنجاح');
    },
    onError: (error: Error) => {
      console.error('Error generating period commission:', error);
      toast.error(error.message || 'حدث خطأ أثناء حساب العمولة المجمعة');
    },
  });

  // تحديث حالة العمولة المجمعة
  const updatePeriodCommissionStatusMutation = useMutation({
    mutationFn: async ({
      commissionPeriodId,
      status,
      paymentDate,
      paymentMethod,
      bankAccountId,
      notes
    }: {
      commissionPeriodId: string;
      status: 'pending' | 'paid' | 'cancelled';
      paymentDate?: string;
      paymentMethod?: string;
      bankAccountId?: string;
      notes?: string;
    }) => {
      console.log('Updating period commission status:', { commissionPeriodId, status });
      
      if (!commissionPeriodId || !status) {
        throw new Error('بيانات غير مكتملة لتحديث حالة العمولة');
      }

      const { data, error } = await supabase.rpc('update_period_commission_status', {
        p_commission_period_id: commissionPeriodId,
        p_status: status,
        p_payment_date: paymentDate,
        p_payment_method: paymentMethod,
        p_bank_account_id: bankAccountId,
        p_notes: notes
      });

      if (error) {
        console.error('Error updating period commission status:', error);
        throw error;
      }

      // التعامل مع استجابة الدالة بطريقة آمنة
      let response: DatabaseFunctionResponse;
      
      try {
        if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
          response = data as unknown as DatabaseFunctionResponse;
        } else {
          throw new Error('استجابة غير متوقعة من الخادم');
        }
        
        if (!response.success) {
          throw new Error(response.message || 'حدث خطأ في تحديث حالة العمولة');
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
        throw new Error('حدث خطأ في معالجة الاستجابة من الخادم');
      }

      console.log('Updated period commission status:', response);
      return response;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['commission-periods'] });
      toast.success(data?.message || 'تم تحديث حالة العمولة بنجاح');
    },
    onError: (error: Error) => {
      console.error('Error updating period commission status:', error);
      toast.error(error.message || 'حدث خطأ أثناء تحديث حالة العمولة');
    },
  });

  // حذف فترة العمولة
  const deletePeriodCommissionMutation = useMutation({
    mutationFn: async (commissionPeriodId: string) => {
      console.log('Deleting period commission:', commissionPeriodId);
      
      if (!commissionPeriodId) {
        throw new Error('معرف فترة العمولة مطلوب');
      }

      const { error } = await supabase
        .from('employee_commission_periods')
        .delete()
        .eq('id', commissionPeriodId);

      if (error) {
        console.error('Error deleting period commission:', error);
        throw error;
      }

      console.log('Deleted period commission successfully');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-periods'] });
      toast.success('تم حذف فترة العمولة بنجاح');
    },
    onError: (error: Error) => {
      console.error('Error deleting period commission:', error);
      toast.error(error.message || 'حدث خطأ أثناء حذف فترة العمولة');
    },
  });

  // حساب إحصائيات العمولات المجمعة
  const getCommissionPeriodsStatistics = () => {
    if (!commissionPeriods) return null;

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const stats = {
      totalPeriods: commissionPeriods.length,
      pendingPeriods: commissionPeriods.filter(p => p.status === 'pending').length,
      paidPeriods: commissionPeriods.filter(p => p.status === 'paid').length,
      totalPendingAmount: commissionPeriods
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + p.commission_amount, 0),
      totalPaidThisMonth: commissionPeriods
        .filter(p => {
          if (!p.payment_date) return false;
          const paymentDate = new Date(p.payment_date);
          return paymentDate.getMonth() === currentMonth && 
                 paymentDate.getFullYear() === currentYear &&
                 p.status === 'paid';
        })
        .reduce((sum, p) => sum + p.commission_amount, 0),
      averageCommissionRate: commissionPeriods.length > 0 
        ? commissionPeriods.reduce((sum, p) => sum + p.commission_rate, 0) / commissionPeriods.length
        : 0
    };

    return stats;
  };

  const generatePeriodCommission = (data: {
    employeeId: string;
    periodStart: string;
    periodEnd: string;
    notes?: string;
  }) => {
    generatePeriodCommissionMutation.mutate(data);
  };

  const updatePeriodCommissionStatus = (data: {
    commissionPeriodId: string;
    status: 'pending' | 'paid' | 'cancelled';
    paymentDate?: string;
    paymentMethod?: string;
    bankAccountId?: string;
    notes?: string;
  }) => {
    updatePeriodCommissionStatusMutation.mutate(data);
  };

  const deletePeriodCommission = (commissionPeriodId: string) => {
    deletePeriodCommissionMutation.mutate(commissionPeriodId);
  };

  return {
    commissionPeriods,
    periodsLoading,
    periodsError,
    getEmployeeBookingsProfit,
    generatePeriodCommission,
    updatePeriodCommissionStatus,
    deletePeriodCommission,
    getCommissionPeriodsStatistics,
    isGenerating: generatePeriodCommissionMutation.isPending,
    isUpdatingStatus: updatePeriodCommissionStatusMutation.isPending,
    isDeleting: deletePeriodCommissionMutation.isPending,
  };
};
