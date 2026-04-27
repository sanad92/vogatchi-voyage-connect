import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { CommissionPayment } from '@/types/expenses';
import { useOrgId } from './useOrgId';

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
  organization_id?: string;
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
  const orgId = useOrgId();

  const { data: commissions, isLoading: commissionsLoading, error: commissionsError } = useQuery({
    queryKey: ['employee-commissions', orgId],
    queryFn: async () => {
      let query = supabase
        .from('employee_commissions')
        .select(`*, employee:employees(full_name, employee_code)`)
        .order('commission_date', { ascending: false });
      if (orgId) query = query.eq('organization_id', orgId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown) as EmployeeCommissionWithEmployee[];
    },
    enabled: !!orgId,
  });

  const { data: commissionPayments, isLoading: paymentsLoading, error: paymentsError } = useQuery({
    queryKey: ['commission-payments', orgId],
    queryFn: async () => {
      let query = supabase
        .from('commission_payments')
        .select(`*, employee:employees(full_name, employee_code)`)
        .order('payment_date', { ascending: false });
      if (orgId) query = query.eq('organization_id', orgId);
      const { data, error } = await query;
      if (error) throw error;
      return (data as unknown) as CommissionPayment[];
    },
    enabled: !!orgId,
  });

  const getEmployeeCommissions = (employeeId: string) => {
    return useQuery({
      queryKey: ['employee-commissions', employeeId, orgId],
      queryFn: async () => {
        let query = supabase
          .from('employee_commissions')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('payment_status', 'pending')
          .order('commission_date', { ascending: false });
        if (orgId) query = query.eq('organization_id', orgId);
        const { data, error } = await query;
        if (error) throw error;
        return (data as unknown) as EmployeeCommissionWithEmployee[];
      },
      enabled: !!employeeId && !!orgId,
    });
  };

  const validateEmployeeCommissionsMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const { data, error } = await supabase.rpc('validate_employee_commissions' as any, {
        p_employee_id: employeeId
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      if (data && Array.isArray(data) && data.length > 0) {
        toast({ title: "تم العثور على مشاكل في العمولات", description: `عدد المشاكل المكتشفة: ${data.length}`, variant: "destructive" });
      } else {
        toast({ title: "العمولات صحيحة", description: "لا توجد مشاكل في عمولات هذا الموظف" });
      }
    },
    onError: (error: any) => {
      toast({ title: "خطأ في التحقق", description: error?.message || "حدث خطأ", variant: "destructive" });
    },
  });

  const updateEmployeeCommissionSettingsMutation = useMutation({
    mutationFn: async ({ employeeId, settings }: { employeeId: string; settings: { commission_rate: number; commission_type: string; } }) => {
      if (settings.commission_rate < 0 || settings.commission_rate > 100) {
        throw new Error('معدل العمولة يجب أن يكون بين 0 و 100');
      }
      const { data, error } = await supabase
        .from('employees')
        .update({ commission_rate: settings.commission_rate, commission_type: settings.commission_type, updated_at: new Date().toISOString() })
        .eq('id', employeeId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: "تم التحديث بنجاح", description: "تم تحديث إعدادات العمولة بنجاح" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في التحديث", description: error.message || "حدث خطأ", variant: "destructive" });
    },
  });

  const addCommissionPaymentMutation = useMutation({
    mutationFn: async (payment: Omit<CommissionPayment, 'id' | 'created_at' | 'updated_at'>) => {
      if (!payment.employee_id || !payment.total_commission_amount || payment.total_commission_amount <= 0) {
        throw new Error('بيانات الدفع غير صحيحة');
      }

      let pendingQuery = supabase
        .from('employee_commissions')
        .select('*')
        .eq('employee_id', payment.employee_id)
        .eq('payment_status', 'pending')
        .gte('commission_date', payment.payment_period_start)
        .lte('commission_date', payment.payment_period_end);
      if (orgId) pendingQuery = pendingQuery.eq('organization_id', orgId);

      const { data: pendingCommissions, error: pendingError } = await pendingQuery;
      if (pendingError) throw new Error('خطأ في جلب العمولات المعلقة');
      if (!pendingCommissions || pendingCommissions.length === 0) {
        throw new Error('لا توجد عمولات في انتظار الدفع للفترة المحددة');
      }

      const actualTotal = pendingCommissions.reduce((sum, c) => sum + c.commission_amount, 0);
      if (Math.abs(actualTotal - payment.total_commission_amount) > 0.01) {
        throw new Error(`مبلغ الدفع لا يطابق إجمالي العمولات. المتوقع: ${actualTotal}, المدخل: ${payment.total_commission_amount}`);
      }

      const userId = (await supabase.auth.getUser()).data.user?.id;
      const insertPayload: any = { ...payment, created_by: userId, organization_id: orgId };

      const { data, error } = await supabase
        .from('commission_payments')
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;

      const commissionIds = pendingCommissions.map(c => c.id);
      await markCommissionsAsPaidMutation.mutateAsync({
        employeeId: payment.employee_id,
        commissionIds,
        paymentDate: payment.payment_date
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commission-payments'] });
      queryClient.invalidateQueries({ queryKey: ['employee-commissions'] });
      toast({ title: "تم الحفظ بنجاح", description: "تم إضافة دفعة العمولة وتحديث حالة العمولات" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الحفظ", description: error.message || "حدث خطأ", variant: "destructive" });
    },
  });

  const markCommissionsAsPaidMutation = useMutation({
    mutationFn: async ({ employeeId, commissionIds, paymentDate }: { employeeId: string; commissionIds: string[]; paymentDate: string; }) => {
      if (!employeeId || !commissionIds.length || !paymentDate) throw new Error('بيانات التحديث غير صحيحة');
      const { error } = await supabase
        .from('employee_commissions')
        .update({ payment_status: 'paid', payment_date: paymentDate })
        .in('id', commissionIds)
        .eq('employee_id', employeeId);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['employee-commissions'] }); },
    onError: (error) => { throw error; },
  });

  const cancelCommissionMutation = useMutation({
    mutationFn: async ({ commissionId, reason }: { commissionId: string; reason?: string }) => {
      const { data, error } = await supabase.rpc('cancel_commission' as any, { p_commission_id: commissionId, p_reason: reason });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: "تم الإلغاء بنجاح", description: "تم إلغاء العمولة" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الإلغاء", description: error.message || "حدث خطأ", variant: "destructive" });
    },
  });

  const calculateCommissionMutation = useMutation({
    mutationFn: async ({ employeeId, bookingAmount, bookingId, bookingType, commissionRate }: { employeeId: string; bookingAmount: number; bookingId: string; bookingType: string; commissionRate?: number; }) => {
      const { data: commissionAmount, error } = await supabase.rpc('calculate_employee_commission' as any, {
        p_employee_id: employeeId, p_booking_amount: bookingAmount, p_commission_rate: commissionRate
      });
      if (error) throw error;

      const insertPayload: any = {
        employee_id: employeeId,
        booking_id: bookingId,
        booking_type: bookingType,
        booking_amount: bookingAmount,
        commission_rate: commissionRate || 0,
        commission_amount: commissionAmount,
        currency: 'EGP',
        notes: 'تم إضافتها يدوياً',
        organization_id: orgId,
      };

      const { data, error: insertError } = await supabase
        .from('employee_commissions')
        .insert(insertPayload)
        .select()
        .single();
      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-commissions'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast({ title: "تم الحساب بنجاح", description: "تم حساب وإضافة العمولة" });
    },
    onError: (error: any) => {
      toast({ title: "خطأ في الحساب", description: error.message || "حدث خطأ", variant: "destructive" });
    },
  });

  const validateEmployeeCommissions = (employeeId: string) => validateEmployeeCommissionsMutation.mutate(employeeId);
  const updateEmployeeCommissionSettings = (employeeId: string, settings: { commission_rate: number; commission_type: string }) =>
    updateEmployeeCommissionSettingsMutation.mutate({ employeeId, settings });
  const addCommissionPayment = (payment: Omit<CommissionPayment, 'id' | 'created_at' | 'updated_at'>) =>
    addCommissionPaymentMutation.mutate(payment);
  const markCommissionsAsPaid = (data: { employeeId: string; commissionIds: string[]; paymentDate: string }) =>
    markCommissionsAsPaidMutation.mutate(data);
  const cancelCommission = (data: { commissionId: string; reason?: string }) => cancelCommissionMutation.mutate(data);
  const calculateCommission = (data: { employeeId: string; bookingAmount: number; bookingId: string; bookingType: string; commissionRate?: number; }) =>
    calculateCommissionMutation.mutate(data);

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
