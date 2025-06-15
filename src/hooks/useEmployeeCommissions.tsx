
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { EmployeeCommission, CommissionPayment } from '@/types/expenses';

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
      return data as EmployeeCommission[];
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
        return data as EmployeeCommission[];
      },
      enabled: !!employeeId,
    });
  };

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
        description: "حدث خطأ أثناء تحديث إعدادات العمولة",
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

      const { data, error } = await supabase
        .from('commission_payments')
        .insert(payment)
        .select()
        .single();

      if (error) {
        console.error('Error adding commission payment:', error);
        throw error;
      }
      console.log('Added commission payment:', data);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-payments'] });
      queryClient.invalidateQueries({ queryKey: ['employee-commissions'] });
      toast({
        title: "تم الحفظ بنجاح",
        description: "تم إضافة دفعة العمولة بنجاح",
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
      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث حالة العمولات إلى مدفوعة",
      });
    },
    onError: (error) => {
      console.error('Error updating commission status:', error);
      toast({
        title: "خطأ في التحديث",
        description: error.message || "حدث خطأ أثناء تحديث حالة العمولات",
        variant: "destructive",
      });
    },
  });

  const updateEmployeeCommissionSettings = (employeeId: string, settings: { commission_rate: number; commission_type: string }) => {
    updateEmployeeCommissionSettingsMutation.mutate({ employeeId, settings });
  };

  const addCommissionPayment = (payment: Omit<CommissionPayment, 'id' | 'created_at' | 'updated_at'>) => {
    addCommissionPaymentMutation.mutate(payment);
  };

  const markCommissionsAsPaid = (data: { employeeId: string; commissionIds: string[]; paymentDate: string }) => {
    markCommissionsAsPaidMutation.mutate(data);
  };

  return {
    commissions,
    commissionsLoading,
    commissionsError,
    commissionPayments,
    paymentsLoading,
    paymentsError,
    getEmployeeCommissions,
    updateEmployeeCommissionSettings,
    addCommissionPayment,
    markCommissionsAsPaid,
    isUpdatingSettings: updateEmployeeCommissionSettingsMutation.isPending,
    isAddingPayment: addCommissionPaymentMutation.isPending,
    isUpdatingStatus: markCommissionsAsPaidMutation.isPending,
  };
};
