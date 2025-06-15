
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface EmployeeAttendance {
  id: string;
  employee_id: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  actual_hours: number;
  overtime_hours: number;
  late_minutes: number;
  early_leave_minutes: number;
  status: 'present' | 'absent' | 'sick_leave' | 'vacation' | 'holiday';
  notes: string | null;
}

interface AttendanceSummary {
  total_days: number;
  present_days: number;
  absent_days: number;
  total_hours: number;
  overtime_hours: number;
  late_hours: number;
}

export const useAttendance = () => {
  const queryClient = useQueryClient();

  // جلب سجلات الحضور
  const { data: attendanceRecords, isLoading: attendanceLoading } = useQuery({
    queryKey: ['employee-attendance'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employee_attendance')
        .select(`
          *,
          employee:employees(full_name, employee_code)
        `)
        .order('attendance_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // إضافة سجل حضور
  const { mutateAsync: addAttendanceRecord, isPending: isAddingAttendance } = useMutation({
    mutationFn: async (attendance: Omit<EmployeeAttendance, 'id'>) => {
      const { data, error } = await supabase
        .from('employee_attendance')
        .insert(attendance)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-attendance'] });
    },
  });

  // تحديث سجل حضور
  const { mutateAsync: updateAttendanceRecord, isPending: isUpdatingAttendance } = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployeeAttendance> & { id: string }) => {
      const { data, error } = await supabase
        .from('employee_attendance')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-attendance'] });
    },
  });

  // جلب ملخص الحضور لموظف في شهر معين
  const getAttendanceSummary = async (employeeId: string, month: string): Promise<AttendanceSummary> => {
    const { data, error } = await supabase
      .rpc('calculate_monthly_attendance', {
        p_employee_id: employeeId,
        p_month: month
      });

    if (error) throw error;
    return data[0] || {
      total_days: 0,
      present_days: 0,
      absent_days: 0,
      total_hours: 0,
      overtime_hours: 0,
      late_hours: 0
    };
  };

  return {
    attendanceRecords,
    attendanceLoading,
    addAttendanceRecord,
    isAddingAttendance,
    updateAttendanceRecord,
    isUpdatingAttendance,
    getAttendanceSummary,
  };
};
