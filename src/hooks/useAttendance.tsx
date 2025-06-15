
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

  // محاكاة بيانات الحضور (سيتم استبدالها بالبيانات الحقيقية لاحقاً)
  const { data: attendanceRecords, isLoading: attendanceLoading } = useQuery({
    queryKey: ['employee-attendance'],
    queryFn: async () => {
      // بيانات وهمية للعرض
      return [] as EmployeeAttendance[];
    },
  });

  // إضافة سجل حضور (محاكاة)
  const { mutateAsync: addAttendanceRecord, isPending: isAddingAttendance } = useMutation({
    mutationFn: async (attendance: Omit<EmployeeAttendance, 'id'>) => {
      // محاكاة العملية
      return { id: '1', ...attendance } as EmployeeAttendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-attendance'] });
    },
  });

  // تحديث سجل حضور (محاكاة)
  const { mutateAsync: updateAttendanceRecord, isPending: isUpdatingAttendance } = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EmployeeAttendance> & { id: string }) => {
      // محاكاة العملية
      return { id, ...updates } as EmployeeAttendance;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee-attendance'] });
    },
  });

  // جلب ملخص الحضور لموظف في شهر معين (محاكاة)
  const getAttendanceSummary = async (employeeId: string, month: string): Promise<AttendanceSummary> => {
    // محاكاة البيانات
    return {
      total_days: 30,
      present_days: 28,
      absent_days: 2,
      total_hours: 224,
      overtime_hours: 8,
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
