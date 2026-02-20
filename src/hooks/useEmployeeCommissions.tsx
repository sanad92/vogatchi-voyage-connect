import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { CommissionPayment } from '@/types/expenses';

// تعريف نوع EmployeeCommission مع employee مبسط
interface EmployeeCommissionWithEmployee {
  id: string;
  employee_id: string;
  booking_id: string;
  booking_type: string;
  booking_amount: number;
  commission_rate: number;
  commission_amount: number;
  currency: string;
  payment_status: string;
  payment_date?: string;
  commission_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  approved_by?: string;
  approved_at?: string;
  employee: {
    full_name: string;
    employee_code: string;
  };
}

export const useEmployeeCommissions = () => {
  const queryClient = useQueryClient();

  // جلب عمولات الموظفين
  const { data: commissions, isLoading: commissionsLoading, error: commissionsError } = useQuery({
    queryKey: ['employee-commissions'],
    queryFn: async () => {
      console.log('Fetching employee commissions...');
      const { data, error } = await supabase
        .from('employee_commissions')
        .select(`
          *,
          employee:employees(full_name, employee_code)
        `)
        .order('commission_date', { ascending: false });

      if (error) {
        console.error('Error fetching commissions:', error);
        throw error;
      }
      console.log('Fetched commissions:', data);
      return data as EmployeeCommissionWithEmployee[];
    },
  });

  // جلب مدفوعات العمولات
  const { data: commissionPayments, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['commission-payments'],
    queryFn: async () => {
      console.log('Fetching commission payments...');
      const { data, error } = await supabase
        .from('commission_payments')
        .select(`
          *,
          employee:employees(full_name, employee_code)
        `)
        .order('payment_date', { ascending: false });

      if (error) {
        console.error('Error fetching commission payments:', error);
        throw error;
      }
      console.log('Fetched commission payments:', data);
      return data as CommissionPayment[];
    },
  });

  // جلب عمولات موظف محدد
  const getEmployeeCommissions = (employeeId: string) => {
    return useQuery({
      queryKey: ['employee-commissions', employeeId],
      queryFn: async () => {
        console.log('Fetching commissions for employee:', employeeId);
        const { data, error } = await supabase
          .from('employee_commissions')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('payment_status', 'pending')
          .order('commission_date', { ascending: false });

        if (error) {
          console.error('Error fetching employee commissions:', error);
          throw error;
        }
        console.log('Fetched employee commissions:', data);
        return data as EmployeeCommissionWithEmployee[];
      },
      enabled: !!employeeId,
    });
  };

  // التحقق من صحة عمولات الموظف
  const validateEmployeeCommissionsMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      console.log('Validating commissions for employee:', employeeId);
      const { data, error } = await supabase.rpc('validate_employee_commissions' as any, {
        p_employee_id: employeeId
      });

      if (error) {
        console.error('Error validating commissions:', error);
        throw error;
      }
      return data;
    },
    onSuccess: (data: any) => {
      if (data && Array.isArray(data) && data.length > 0) {
        toast({
          title: "تم العثور على مشاكل في العمولات",
          description: `عدد المشاكل المكتشفة: ${data.length}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "العمولات صحيحة",
          description: "لا توجد مشاكل في عمولات هذا الموظف",
        });
      }
    },
    onError: (error) => {
      console.error('Error validating commissions:', error);
      toast({
        title: "خطأ في التحقق",
        description: "حدث خطأ أثناء التحقق من صحة العمولات",
        variant: "destructive",
      });
    },
  });

  // تحديث إعدادات العمولة للموظف
  const updateEmployeeCommissionSettingsMutation = useMutation({
    mutationFn: async ({ employeeId, settings }: {
      employeeId: string;
      settings: {
        commission_rate: number;
        commission_type: string;
      }
    }) => {
      console.log('Updating employee commission settings:', { employeeId, settings });
      
      // التحقق من صحة البيانات
      if (settings.commission_rate < 0 || settings.commission_rate > 100) {
        throw new Error('معدل العمولة يجب أن يكون بين 0 و 100');
      }

      const { data, error } = await supabase
        .from('employees')
        .update({
          commission_rate: settings.commission_rate,
          commission_type: settings.commission_type,
          updated_at: new Date().toISOString()
        })
        .eq('id', employeeId)
        .select()
        .single();

      if (error) {
        console.error('Error updating employee commission settings:', error);
        throw error;
      }
      console.log('Updated employee commission settings:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث إعدادات العمولة بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error updating commission settings:', error);
      toast({
        title: "خطأ في التحديث",
        description: error.message || "حدث خطأ أثناء تحديث إعدادات العمولة",
        variant: "destructive",
      });
    },
  });

  // إضافة دفعة عمولة جديدة
  const addCommissionPaymentMutation = useMutation({
    mutationFn: async (payment: Omit<CommissionPayment, 'id' | 'created_at' | 'updated_at'>) => {
      console.log('Adding commission payment:', payment);
      
      // التحقق من صحة البيانات
      if (!payment.employee_id || !payment.total_commission_amount || payment.total_commission_amount <= 0) {
        throw new Error('بيانات الدفع غير صحيحة');
      }

      // التحقق من وجود عمولات في انتظار الدفع للموظف
      const { data: pendingCommissions, error: pendingError } = await supabase
        .from('employee_commissions')
        .select('*')
        .eq('employee_id', payment.employee_id)
        .eq('payment_status', 'pending')
        .gte('commission_date', payment.payment_period_start)
        .lte('commission_date', payment.payment_period_end);

      if (pendingError) {
        throw new Error('خطأ في جلب العمولات المعلقة');
      }

      if (!pendingCommissions || pendingCommissions.length === 0) {
        throw new Error('لا توجد عمولات في انتظار الدفع للفترة المحددة');
      }

      // حساب المجموع الفعلي للعمولات
      const actualTotal = pendingCommissions.reduce((sum, commission) => sum + commission.commission_amount, 0);
      
      if (Math.abs(actualTotal - payment.total_commission_amount) > 0.01) {
        throw new Error(`مبلغ الدفع لا يطابق إجمالي العمولات المستحقة. المتوقع: ${actualTotal}, المدخل: ${payment.total_commission_amount}`);
      }

      // إضافة سجل الدفع
      const { data, error } = await supabase
        .from('commission_payments')
        .insert({
          ...payment,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding commission payment:', error);
        throw error;
      }

      // تحديث حالة العمولات إلى مدفوعة
      const commissionIds = pendingCommissions.map(c => c.id);
      await markCommissionsAsPaidMutation.mutateAsync({
        employeeId: payment.employee_id,
        commissionIds,
        paymentDate: payment.payment_date
      });

      console.log('Added commission payment:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-payments'] });
      queryClient.invalidateQueries({ queryKey: ['employee-commissions'] });
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم إضافة دفعة العمولة وتحديث حالة العمولات بنجاح",
      });
    },
    onError: (error) => {
      console.error('Error adding commission payment:', error);
      toast({
        title: "خطأ في الحفظ",
        description: error.message || "حدث خطأ أثناء إضافة دفعة العمولة",
        variant: "destructive",
      });
    },
  });

  // تحديث حالة العمولات إلى مدفوعة
  const markCommissionsAsPaidMutation = useMutation({
    mutationFn: async ({ employeeId, commissionIds, paymentDate }: {
      employeeId: string;
      commissionIds: string[];
      paymentDate: string;
    }) => {
      console.log('Marking commissions as paid:', { employeeId, commissionIds, paymentDate });
      
      // التحقق من صحة البيانات
      if (!employeeId || !commissionIds.length || !paymentDate) {
        throw new Error('بيانات التحديث غير صحيحة');
      }

      const { error } = await supabase
        .from('employee_commissions')
        .update({
          payment_status: 'paid',
          payment_date: paymentDate
        })
        .in('id', commissionIds)
        .eq('employee_id', employeeId);

      if (error) {
        console.error('Error updating commission status:', error);
        throw error;
      }
      console.log('Successfully marked commissions as paid');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-commissions'] });
    },
    onError: (error) => {
      console.error('Error updating commission status:', error);
      throw error; // إعادة طرح الخطأ ليتم التعامل معه في addCommissionPaymentMutation
    },
  });

  // إلغاء عمولة
  const cancelCommissionMutation = useMutation({
    mutationFn: async ({ commissionId, reason }: { commissionId: string; reason?: string }) => {
      console.log('Cancelling commission:', { commissionId, reason });
      
      const { data, error } = await supabase.rpc('cancel_commission' as any, {
        p_commission_id: commissionId,
        p_reason: reason
      });

      if (error) {
        console.error('Error cancelling commission:', error);
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "تم الإلغاء بنجاح",
        description: "تم إلغاء العمولة وتحديث البيانات",
      });
    },
    onError: (error) => {
      console.error('Error cancelling commission:', error);
      toast({
        title: "خطأ في الإلغاء",
        description: error.message || "حدث خطأ أثناء إلغاء العمولة",
        variant: "destructive",
      });
    },
  });

  // حساب عمولة يدوياً
  const calculateCommissionMutation = useMutation({
    mutationFn: async ({ 
      employeeId, 
      bookingAmount, 
      bookingId, 
      bookingType,
      commissionRate 
    }: {
      employeeId: string;
      bookingAmount: number;
      bookingId: string;
      bookingType: string;
      commissionRate?: number;
    }) => {
      console.log('Calculating commission manually:', { employeeId, bookingAmount, commissionRate });
      
      // حساب العمولة باستخدام دالة قاعدة البيانات
      const { data: commissionAmount, error } = await supabase.rpc('calculate_employee_commission', {
        p_employee_id: employeeId,
        p_booking_amount: bookingAmount,
        p_commission_rate: commissionRate
      });

      if (error) {
        throw error;
      }

      // إضافة العمولة يدوياً
      const { data, error: insertError } = await supabase
        .from('employee_commissions')
        .insert({
          employee_id: employeeId,
          booking_id: bookingId,
          booking_type: bookingType,
          booking_amount: bookingAmount,
          commission_rate: commissionRate || 0,
          commission_amount: commissionAmount,
          currency: 'EGP',
          created_by: (await supabase.auth.getUser()).data.user?.id,
          notes: 'تم إضافتها يدوياً'
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({
        title: "تم الحساب بنجاح",
        description: "تم حساب وإضافة العمولة يدوياً",
      });
    },
    onError: (error) => {
      console.error('Error calculating commission:', error);
      toast({
        title: "خطأ في الحساب",
        description: error.message || "حدث خطأ أثناء حساب العمولة",
        variant: "destructive",
      });
    },
  });

  const validateEmployeeCommissions = (employeeId: string) => {
    validateEmployeeCommissionsMutation.mutate(employeeId);
  };

  const updateEmployeeCommissionSettings = (employeeId: string, settings: { commission_rate: number; commission_type: string }) => {
    updateEmployeeCommissionSettingsMutation.mutate({ employeeId, settings });
  };

  const addCommissionPayment = (payment: Omit<CommissionPayment, 'id' | 'created_at' | 'updated_at'>) => {
    addCommissionPaymentMutation.mutate(payment);
  };

  const markCommissionsAsPaid = (data: { employeeId: string; commissionIds: string[]; paymentDate: string }) => {
    markCommissionsAsPaidMutation.mutate(data);
  };

  const cancelCommission = (data: { commissionId: string; reason?: string }) => {
    cancelCommissionMutation.mutate(data);
  };

  const calculateCommission = (data: {
    employeeId: string;
    bookingAmount: number;
    bookingId: string;
    bookingType: string;
    commissionRate?: number;
  }) => {
    calculateCommissionMutation.mutate(data);
  };

  return {
    commissions,
    commissionsLoading,
    commissionsError,
    commissionPayments,
    paymentsLoading,
    paymentsError,
    getEmployeeCommissions,
    validateEmployeeCommissions,
    updateEmployeeCommissionSettings,
    addCommissionPayment,
    markCommissionsAsPaid,
    cancelCommission,
    calculateCommission,
    isValidating: validateEmployeeCommissionsMutation.isPending,
    isUpdatingSettings: updateEmployeeCommissionSettingsMutation.isPending,
    isAddingPayment: addCommissionPaymentMutation.isPending,
    isUpdatingStatus: markCommissionsAsPaidMutation.isPending,
    isCancelling: cancelCommissionMutation.isPending,
    isCalculating: calculateCommissionMutation.isPending,
  };
};
