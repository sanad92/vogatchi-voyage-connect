import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgId } from '@/hooks/useOrgId';
import type { TablesInsert } from '@/integrations/supabase/types';

type AttendanceInput = Omit<TablesInsert<'employee_attendance'>, 'organization_id'>;

export function useAttendance(date?: string) {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['employee-attendance', orgId, user?.id, date],
    enabled: Boolean(orgId && user?.id && date),
    queryFn: async () => {
      const { data, error } = await supabase.from('employee_attendance').select('*, employee:employees!employee_attendance_organization_id_employee_id_fkey(full_name)')
        .eq('organization_id', orgId!).eq('attendance_date', date!);
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (record: AttendanceInput) => {
      if (!orgId) throw new Error('تعذّر تحديد المؤسسة');
      const { error } = await supabase.from('employee_attendance').upsert(
        { ...record, organization_id: orgId },
        { onConflict: 'organization_id,employee_id,attendance_date' },
      ).select('id').single();
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee-attendance', orgId] }),
  });

  const register = useMutation({
    mutationFn: async ({ employeeIds, date, status }: {
      employeeIds: string[]; date: string; status: 'present' | 'absent';
    }) => {
      if (!orgId || !employeeIds.length) throw new Error('اختر موظفًا للتسجيل');
      const { data, error } = await supabase.from('employee_attendance').upsert(
        employeeIds.map(employee_id => ({ employee_id, organization_id: orgId, attendance_date: date, status })),
        { onConflict: 'organization_id,employee_id,attendance_date', ignoreDuplicates: true },
      ).select('employee_id');
      if (error) throw error;
      return data.length;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee-attendance', orgId] }),
  });

  const getAttendanceSummary = async (employeeId: string, month: string) => {
    if (!orgId) throw new Error('تعذّر تحديد المؤسسة');
    const firstDay = `${month.slice(0, 7)}-01`;
    const nextMonth = new Date(`${firstDay}T00:00:00Z`);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    const { data, error } = await supabase.from('employee_attendance')
      .select('status, actual_hours').eq('organization_id', orgId).eq('employee_id', employeeId)
      .gte('attendance_date', firstDay).lt('attendance_date', nextMonth.toISOString().slice(0, 10));
    if (error) throw error;
    return {
      total_days: data.length,
      present_days: data.filter(row => row.status === 'present').length,
      absent_days: data.filter(row => row.status === 'absent').length,
      total_hours: data.reduce((sum, row) => sum + (row.actual_hours ?? 0), 0),
      overtime_hours: 0,
      late_hours: 0,
    };
  };

  return {
    attendanceRecords: query.data ?? [],
    attendanceLoading: query.isLoading,
    attendanceError: query.error,
    retryAttendance: query.refetch,
    saveAttendance: save.mutateAsync,
    registerAttendance: register.mutateAsync,
    isSavingAttendance: save.isPending || register.isPending,
    getAttendanceSummary,
  };
}
