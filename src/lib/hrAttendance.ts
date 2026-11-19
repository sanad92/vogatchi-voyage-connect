export const ATTENDANCE_LABELS = {
  present: 'حاضر',
  absent: 'غائب',
  vacation: 'إجازة',
  sick_leave: 'إجازة مرضية',
  holiday: 'عطلة',
} as const;

export type AttendanceStatus = keyof typeof ATTENDANCE_LABELS;

export function attendanceLabel(status?: string) {
  return status ? ATTENDANCE_LABELS[status as AttendanceStatus] ?? status : 'غير مسجّل';
}
