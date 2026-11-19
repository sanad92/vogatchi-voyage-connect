import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { useHrAccess } from '@/hooks/useHrAccess';

const STATUSES = {
  present: 'حاضر',
  absent: 'غائب',
  vacation: 'إجازة',
  sick_leave: 'إجازة مرضية',
  holiday: 'عطلة',
} satisfies Record<string, string>;

type AttendanceStatus = keyof typeof STATUSES;

interface Draft {
  employeeId: string;
  employeeName: string;
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  notes: string;
}

export default function AttendanceManagement() {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [draft, setDraft] = useState<Draft | null>(null);
  const { canViewAttendance, canEditAttendance } = useHrAccess();
  const { attendanceRecords, attendanceLoading, attendanceError, retryAttendance, saveAttendance, isSavingAttendance } = useAttendance(canViewAttendance ? date : undefined);
  const { employees, employeesLoading, employeesError } = useEmployees();
  const byEmployee = new Map(attendanceRecords.map(record => [record.employee_id, record]));
  const activeEmployees = employees ?? [];
  const roster = [
    ...activeEmployees,
    ...attendanceRecords.filter(record => !activeEmployees.some(employee => employee.id === record.employee_id))
      .map(record => ({ id: record.employee_id, full_name: record.employee?.full_name ?? 'موظف غير نشط', department: undefined })),
  ];

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEditAttendance || !draft || !date) return;
    try {
      await saveAttendance({
        employee_id: draft.employeeId,
        attendance_date: date,
        status: draft.status,
        check_in_time: draft.status === 'present' ? draft.checkIn || null : null,
        check_out_time: draft.status === 'present' ? draft.checkOut || null : null,
        notes: draft.notes.trim() || null,
      });
      setDraft(null);
      toast.success('تم حفظ سجل الحضور');
    } catch {
      toast.error('تعذّر حفظ سجل الحضور');
    }
  };

  if (!canViewAttendance) return null;
  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>الحضور والإجازات</CardTitle>
        <div className="space-y-1">
          <Label htmlFor="attendance-date">تاريخ السجل</Label>
          <Input id="attendance-date" type="date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value); }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {(attendanceLoading || employeesLoading) && <p role="status">جارٍ تحميل السجل…</p>}
        {(attendanceError || employeesError) && <div role="alert" className="flex items-center gap-3 text-destructive">
          تعذّر تحميل سجل الحضور.
          <Button size="sm" variant="outline" onClick={() => void retryAttendance()}>إعادة المحاولة</Button>
        </div>}
        {!attendanceLoading && !employeesLoading && !attendanceError && !employeesError && <>
          <div className="flex flex-wrap gap-2 text-sm">
            <Badge variant="secondary">{attendanceRecords.filter(record => record.status === 'present').length} حاضر</Badge>
            <Badge variant="secondary">{attendanceRecords.filter(record => record.status === 'absent').length} غائب</Badge>
            <Badge variant="outline">{roster.filter(employee => !byEmployee.has(employee.id)).length} غير مسجّل</Badge>
          </div>
          <Table>
            <TableHeader><TableRow>
              <TableHead>الموظف</TableHead><TableHead>القسم</TableHead><TableHead>الحالة</TableHead>
              <TableHead>الدخول والخروج</TableHead><TableHead>الساعات</TableHead>
              {canEditAttendance && <TableHead>الإجراء</TableHead>}
            </TableRow></TableHeader>
            <TableBody>
              {roster.map(employee => {
                const record = byEmployee.get(employee.id);
                const status = record?.status as AttendanceStatus | undefined;
                return <TableRow key={employee.id}>
                  <TableCell className="font-medium">{employee.full_name}</TableCell>
                  <TableCell>{employee.department || '—'}</TableCell>
                  <TableCell><Badge variant={status === 'absent' ? 'destructive' : 'outline'}>{status ? STATUSES[status] : 'غير مسجّل'}</Badge></TableCell>
                  <TableCell dir="ltr" className="text-right">{record?.check_in_time?.slice(0, 5) || '—'} / {record?.check_out_time?.slice(0, 5) || '—'}</TableCell>
                  <TableCell>{record?.actual_hours ?? '—'}</TableCell>
                  {canEditAttendance && <TableCell><Button variant="outline" size="sm"
                    onClick={() => setDraft({ employeeId: employee.id, employeeName: employee.full_name,
                      status: status ?? 'present', notes: record?.notes ?? '',
                      checkIn: record?.check_in_time?.slice(0, 5) ?? '', checkOut: record?.check_out_time?.slice(0, 5) ?? '' })}>
                    {record ? 'تعديل' : 'تسجيل'}
                  </Button></TableCell>}
                </TableRow>;
              })}
              {!roster.length && <TableRow><TableCell colSpan={canEditAttendance ? 6 : 5}>لا يوجد موظفون لعرضهم.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </>}
      </CardContent>
      <Dialog open={Boolean(draft)} onOpenChange={open => { if (!open && !isSavingAttendance) setDraft(null); }}>
        {draft && <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>حضور {draft.employeeName}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="attendance-status">الحالة</Label>
              <Select value={draft.status} onValueChange={(status: AttendanceStatus) => setDraft({ ...draft, status })}>
                <SelectTrigger id="attendance-status"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(STATUSES).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {draft.status === 'present' && <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="attendance-in">وقت الدخول</Label><Input id="attendance-in" type="time" value={draft.checkIn} onChange={event => setDraft({ ...draft, checkIn: event.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor="attendance-out">وقت الخروج</Label><Input id="attendance-out" type="time" value={draft.checkOut} onChange={event => setDraft({ ...draft, checkOut: event.target.value })} /></div>
            </div>}
            <div className="space-y-1"><Label htmlFor="attendance-notes">ملاحظات</Label>
              <Textarea id="attendance-notes" maxLength={1000} value={draft.notes} onChange={event => setDraft({ ...draft, notes: event.target.value })} />
            </div>
            <DialogFooter><Button type="submit" disabled={isSavingAttendance}>{isSavingAttendance ? 'جارٍ الحفظ…' : 'حفظ السجل'}</Button></DialogFooter>
          </form>
        </DialogContent>}
      </Dialog>
    </Card>
  );
}
