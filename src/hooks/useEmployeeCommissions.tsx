
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { EmployeeCommission, CommissionPayment } from '@/types/expenses';

export const useEmployeeCommissions = () => {
  const queryClient = useQueryClient();

  // جلب عمولات الموظفين
  const { data: commissions, isLoading: commissionsLoading } = useQuery({
    queryKey: ['employee-commissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_commissions')
        .select(`
          *,
          employee:employees(full_name, employee_code)
        `)
        .order('commission_date', { ascending: false });

      if (error) throw error;
      return data as EmployeeCommission[];
    },
  });

  // جلب مدفوعات العمولات
  const { data: commissionPayments, isLoading: paymentsLoading } = useQuery({
    queryKey: ['commission-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('commission_payments')
        .select(`
          *,
          employee:employees(full_name, employee_code)
        `)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data as CommissionPayment[];
    },
  });

  // جلب عمولات موظف محدد
  const getEmployeeCommissions = (employeeId: string) => {
    return useQuery({
      queryKey: ['employee-commissions', employeeId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('employee_commissions')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('payment_status', 'pending')
          .order('commission_date', { ascending: false });

        if (error) throw error;
        return data as EmployeeCommission[];
      },
    });
  };

  // إضافة دفعة عمولة جديدة
  const addCommissionPaymentMutation = useMutation({
    mutationFn: async (payment: Omit<CommissionPayment, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('commission_payments')
        .insert(payment)
        .select()
        .single();

      if (error) throw error;
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
        description: "حدث خطأ أثناء إضافة دفعة العمولة",
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
      const { error } = await supabase
        .from('employee_commissions')
        .update({
          payment_status: 'paid',
          payment_date: paymentDate
        })
        .in('id', commissionIds)
        .eq('employee_id', employeeId);

      if (error) throw error;
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
        description: "حدث خطأ أثناء تحديث حالة العمولات",
        variant: "destructive",
      });
    },
  });

  const addCommissionPayment = (payment: Omit<CommissionPayment, 'id' | 'created_at' | 'updated_at'>) => {
    addCommissionPaymentMutation.mutate(payment);
  };

  const markCommissionsAsPaid = (data: { employeeId: string; commissionIds: string[]; paymentDate: string }) => {
    markCommissionsAsPaidMutation.mutate(data);
  };

  return {
    commissions,
    commissionsLoading,
    commissionPayments,
    paymentsLoading,
    getEmployeeCommissions,
    addCommissionPayment,
    markCommissionsAsPaid,
    isAddingPayment: addCommissionPaymentMutation.isPending,
    isUpdatingStatus: markCommissionsAsPaidMutation.isPending,
  };
};
