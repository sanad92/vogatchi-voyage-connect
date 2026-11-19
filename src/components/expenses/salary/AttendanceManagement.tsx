import { useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { CalendarDays, Check, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAttendance } from '@/hooks/useAttendance';
import { useEmployees } from '@/hooks/useEmployees';
import { useHrAccess } from '@/hooks/useHrAccess';
import { useOrgId } from '@/hooks/useOrgId';
import { ATTENDANCE_LABELS, attendanceLabel, type AttendanceStatus } from '@/lib/hrAttendance';

interface Draft {
  employeeId: string;
  employeeName: string;
  status: AttendanceStatus;
  checkIn: string;
  checkOut: string;
  notes: string;
}

function AttendanceDay() {
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const { canViewAttendance, canEditAttendance } = useHrAccess();
  const { attendanceRecords, attendanceLoading, attendanceError, retryAttendance, saveAttendance,
    registerAttendance, isSavingAttendance } = useAttendance(canViewAttendance ? date : undefined);
  const { employees, employeesLoading, employeesError, refetchEmployees } = useEmployees();

  const byEmployee = new Map(attendanceRecords.map(record => [record.employee_id, record]));
  const activeEmployees = employees ?? [];
  const activeIds = new Set(activeEmployees.map(employee => employee.id));
  const roster = [
    ...activeEmployees,
    ...attendanceRecords.filter(record => !activeIds.has(record.employee_id))
      .map(record => ({ id: record.employee_id, full_name: record.employee?.full_name ?? 'موظف غير نشط', department: undefined })),
  ];
  const needle = search.trim().toLocaleLowerCase();
  const visible = roster.filter(employee => {
    const status = byEmployee.get(employee.id)?.status ?? 'unrecorded';
    return (statusFilter === 'all' || status === statusFilter)
      && (!needle || [employee.full_name, employee.department].some(value => value?.toLocaleLowerCase().includes(needle)));
  });
  const availableIds = visible.filter(employee => !byEmployee.has(employee.id)).map(employee => employee.id);
  const chosen = availableIds.filter(id => selected.includes(id));
  const allChosen = availableIds.length > 0 && chosen.length === availableIds.length;

  async function quickSave(employeeIds: string[], status: 'present' | 'absent') {
    if (!canEditAttendance || isSavingAttendance || !employeeIds.length) return;
    try {
      const saved = await registerAttendance({ employeeIds, date, status });
      setSelected(previous => previous.filter(id => !employeeIds.includes(id)));
      if (saved) toast.success(`تم تسجيل ${status === 'present' ? 'الحضور' : 'الغياب'} لـ ${saved} من الموظفين`);
      if (saved < employeeIds.length) toast.info('تم الاحتفاظ بالسجلات الموجودة لهذا اليوم.');
    } catch {
      toast.error('تعذّر تسجيل الحضور. أعد المحاولة.');
    }
  }

  async function submitDetails(event: React.FormEvent) {
    event.preventDefault();
    if (!canEditAttendance || !draft || isSavingAttendance) return;
    try {
      await saveAttendance({
        employee_id: draft.employeeId, attendance_date: date, status: draft.status,
        check_in_time: draft.status === 'present' ? draft.checkIn || null : null,
        check_out_time: draft.status === 'present' ? draft.checkOut || null : null,
        notes: draft.notes.trim() || null,
      });
      setDraft(null);
      toast.success('تم حفظ سجل الحضور');
    } catch {
      toast.error('تعذّر حفظ سجل الحضور');
    }
  }

  function openDetails(employeeId: string, employeeName: string) {
    const record = byEmployee.get(employeeId);
    setDraft({ employeeId, employeeName, status: (record?.status as AttendanceStatus | undefined) ?? 'present',
      notes: record?.notes ?? '', checkIn: record?.check_in_time?.slice(0, 5) ?? '', checkOut: record?.check_out_time?.slice(0, 5) ?? '' });
  }

  if (!canViewAttendance) return null;

  const loading = attendanceLoading || employeesLoading;
  const error = attendanceError || employeesError;
  const unrecorded = activeEmployees.filter(employee => !byEmployee.has(employee.id)).length;
  const present = attendanceRecords.filter(record => record.status === 'present').length;
  const absent = attendanceRecords.filter(record => record.status === 'absent').length;

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> الحضور اليومي</CardTitle>
        <div className="space-y-1.5">
          <Label htmlFor="attendance-date">تاريخ السجل</Label>
          <Input id="attendance-date" type="date" value={date} disabled={isSavingAttendance}
            onChange={event => { if (event.target.value) { setDate(event.target.value); setSelected([]); } }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p role="status" className="text-muted-foreground">جارٍ تحميل السجل…</p>}
        {error && <div role="alert" className="flex flex-wrap items-center gap-3 text-destructive">
          تعذّر تحميل سجل الحضور.
          <Button size="sm" variant="outline" onClick={() => void Promise.all([retryAttendance(), refetchEmployees()])}>إعادة المحاولة</Button>
        </div>}
        {!loading && !error && <>
          <div className="grid grid-cols-3 gap-2">
            {[{ label: 'حاضر', count: present }, { label: 'غائب', count: absent }, { label: 'غير مسجّل', count: unrecorded }].map(item =>
              <div key={item.label} className="rounded-lg border bg-muted/40 px-3 py-2">
                <p className="text-sm text-muted-foreground">{item.label}</p>
                <p className="font-semibold tabular-nums">{item.count}</p>
              </div>)}
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input aria-label="ابحث في سجل الحضور" placeholder="اسم الموظف أو القسم" value={search} className="ps-9"
                onChange={event => { setSearch(event.target.value); setSelected([]); }} />
            </div>
            <Select value={statusFilter} onValueChange={value => { setStatusFilter(value); setSelected([]); }}>
              <SelectTrigger aria-label="حالة الحضور"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                <SelectItem value="unrecorded">غير مسجّل</SelectItem>
                {Object.entries(ATTENDANCE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {canEditAttendance && availableIds.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/60 p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={allChosen ? true : chosen.length ? 'indeterminate' : false}
                disabled={isSavingAttendance} onCheckedChange={checked => setSelected(checked === true ? availableIds : [])} />
              اختيار غير المسجّلين في العرض
            </label>
            {chosen.length > 0 && <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">المحددون {chosen.length}</span>
              <Button size="sm" disabled={isSavingAttendance} onClick={() => void quickSave(chosen, 'present')}>تسجيل المحددين حضور</Button>
              <Button size="sm" variant="outline" disabled={isSavingAttendance} onClick={() => void quickSave(chosen, 'absent')}>تسجيل المحددين غياب</Button>
            </div>}
          </div>}
          <ul className="divide-y rounded-lg border">
            {visible.map(employee => {
              const record = byEmployee.get(employee.id);
              return <li key={employee.id} className="grid gap-2 p-3 md:grid-cols-[minmax(0,1fr)_7rem_8rem_11rem] md:items-center">
                <div className="flex min-w-0 items-center gap-3">
                  {canEditAttendance && !record && <Checkbox aria-label={`تحديد ${employee.full_name}`}
                    disabled={isSavingAttendance} checked={selected.includes(employee.id)}
                    onCheckedChange={checked => setSelected(previous => checked === true ? [...new Set([...previous, employee.id])] : previous.filter(id => id !== employee.id))} />}
                  <div className="min-w-0">
                    <div className="truncate font-medium">{employee.full_name}</div>
                    <div className="truncate text-sm text-muted-foreground">{employee.department || '—'}</div>
                  </div>
                </div>
                <div><Badge variant={record?.status === 'absent' ? 'destructive' : record?.status === 'present' ? 'secondary' : 'outline'}>
                  {attendanceLabel(record?.status)}
                </Badge></div>
                <div className="hidden text-sm text-muted-foreground md:block">
                  {record?.check_in_time || record?.check_out_time ? <div dir="ltr" className="text-right">
                    {record.check_in_time?.slice(0, 5) || '—'} – {record.check_out_time?.slice(0, 5) || '—'}
                  </div> : '—'}
                  {record?.actual_hours != null && <div>{record.actual_hours} ساعة</div>}
                </div>
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {canEditAttendance && !record && <Button size="sm" variant="secondary" disabled={isSavingAttendance}
                    onClick={() => void quickSave([employee.id], 'present')}><Check className="h-4 w-4" /> حاضر</Button>}
                  {(canEditAttendance || record) && <Button size="sm" variant="outline" disabled={isSavingAttendance}
                    onClick={() => openDetails(employee.id, employee.full_name)}>{record ? 'التفاصيل' : 'تسجيل بالتفاصيل'}</Button>}
                </div>
              </li>;
            })}
            {!visible.length && <li className="p-5 text-center text-sm text-muted-foreground">لا توجد نتائج للعرض الحالي.</li>}
          </ul>
        </>}
      </CardContent>
      <Dialog open={Boolean(draft)} onOpenChange={open => { if (!open && !isSavingAttendance) setDraft(null); }}>
        {draft && <DialogContent dir="rtl">
          <DialogHeader className="text-start"><DialogTitle>حضور {draft.employeeName}</DialogTitle>
            <DialogDescription>{date}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitDetails} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="attendance-status">الحالة</Label>
              <Select value={draft.status} disabled={!canEditAttendance || isSavingAttendance}
                onValueChange={(status: AttendanceStatus) => setDraft({ ...draft, status })}>
                <SelectTrigger id="attendance-status"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(ATTENDANCE_LABELS).map(([value, label]) =>
                  <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {draft.status === 'present' && <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label htmlFor="attendance-in">وقت الدخول</Label><Input id="attendance-in" type="time" readOnly={!canEditAttendance}
                value={draft.checkIn} onChange={event => setDraft({ ...draft, checkIn: event.target.value })} /></div>
              <div className="space-y-1"><Label htmlFor="attendance-out">وقت الخروج</Label><Input id="attendance-out" type="time" readOnly={!canEditAttendance}
                value={draft.checkOut} onChange={event => setDraft({ ...draft, checkOut: event.target.value })} /></div>
            </div>}
            <div className="space-y-1"><Label htmlFor="attendance-notes">ملاحظات</Label>
              <Textarea id="attendance-notes" maxLength={1000} readOnly={!canEditAttendance} value={draft.notes}
                onChange={event => setDraft({ ...draft, notes: event.target.value })} />
            </div>
            {canEditAttendance && <DialogFooter><Button type="submit" disabled={isSavingAttendance}>
              {isSavingAttendance ? 'جارٍ الحفظ…' : 'حفظ السجل'}</Button></DialogFooter>}
          </form>
        </DialogContent>}
      </Dialog>
    </Card>
  );
}

export default function AttendanceManagement() {
  const orgId = useOrgId();
  return <AttendanceDay key={orgId} />;
}
