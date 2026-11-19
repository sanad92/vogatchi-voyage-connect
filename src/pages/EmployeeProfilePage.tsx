import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, CalendarDays, Mail, Phone, UserRound, Wallet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHrAccess } from '@/hooks/useHrAccess';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrgId } from '@/hooks/useOrgId';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { supabase } from '@/integrations/supabase/client';
import { attendanceLabel } from '@/lib/hrAttendance';
import { formatMoney } from '@/lib/customerMetrics';

const UUID = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;
const salaryLabels: Record<string, string> = { pending: 'معلّق', paid: 'مدفوع', cancelled: 'ملغى' };
const commissionLabels: Record<string, string> = { pending: 'معلّقة', paid: 'مدفوعة', approved: 'معتمدة', cancelled: 'ملغاة' };

function Field({ label, children }: { label: string; children?: ReactNode }) {
  return <div className="min-w-0">
    <dt className="text-sm text-muted-foreground">{label}</dt>
    <dd className="mt-1 break-words font-medium">{children || '—'}</dd>
  </div>;
}

function ReadState({ loading, error, retry, empty }: { loading: boolean; error: unknown; retry: () => unknown; empty: boolean }) {
  if (loading) return <p role="status" className="text-sm text-muted-foreground">جارٍ التحميل…</p>;
  if (error) return <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-destructive">
    تعذّر تحميل البيانات
    <Button variant="outline" size="sm" onClick={() => void retry()}>إعادة المحاولة</Button>
  </div>;
  if (empty) return <p className="text-sm text-muted-foreground">لا توجد سجلات لعرضها.</p>;
  return null;
}

function AttendanceHistory({ employeeId }: { employeeId: string }) {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const history = useQuery({
    queryKey: ['employee-attendance', orgId, user?.id, 'profile', employeeId],
    enabled: Boolean(orgId && user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from('employee_attendance')
        .select('id, attendance_date, status, check_in_time, check_out_time, actual_hours, notes')
        .eq('organization_id', orgId!).eq('employee_id', employeeId).order('attendance_date', { ascending: false }).limit(12);
      if (error) throw error;
      return data;
    },
  });

  return <Card>
    <CardHeader><CardTitle>آخر سجلات الحضور والإجازات</CardTitle></CardHeader>
    <CardContent>
      <ReadState loading={history.isLoading} error={history.error} retry={history.refetch} empty={!history.data?.length} />
      {history.isSuccess && <ul className="divide-y">
        {history.data.map(record => <li key={record.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
          <div>
            <span className="font-medium" dir="ltr">{record.attendance_date}</span>
            {record.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{record.notes}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {(record.check_in_time || record.check_out_time) && <span dir="ltr">
              {record.check_in_time?.slice(0, 5) ?? '—'} – {record.check_out_time?.slice(0, 5) ?? '—'}
            </span>}
            {record.actual_hours != null && <span>{record.actual_hours} ساعة</span>}
            <Badge variant="outline">{attendanceLabel(record.status)}</Badge>
          </div>
        </li>)}
      </ul>}
    </CardContent>
  </Card>;
}

function Earnings({ employeeId, showPayroll, showCommissions }: { employeeId: string; showPayroll: boolean; showCommissions: boolean }) {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const payroll = useQuery({
    queryKey: ['monthly-salaries-improved', orgId, user?.id, 'profile', employeeId],
    enabled: Boolean(orgId && user?.id && showPayroll),
    queryFn: async () => {
      const { data, error } = await supabase.from('monthly_salaries').select('id, salary_month, net_salary, currency, status')
        .eq('organization_id', orgId!).eq('employee_id', employeeId).order('salary_month', { ascending: false }).limit(6);
      if (error) throw error;
      return data;
    },
  });
  const commissions = useQuery({
    queryKey: ['employee-commissions', orgId, user?.id, 'profile', employeeId],
    enabled: Boolean(orgId && user?.id && showCommissions),
    queryFn: async () => {
      const { data, error } = await supabase.from('employee_commissions').select('id, commission_date, commission_amount, currency, payment_status')
        .eq('organization_id', orgId!).eq('employee_id', employeeId).order('commission_date', { ascending: false, nullsFirst: false }).limit(8);
      if (error) throw error;
      return data;
    },
  });

  return <div className="grid gap-4 lg:grid-cols-2">
    {showPayroll && <Card><CardHeader><CardTitle>الرواتب الأخيرة</CardTitle></CardHeader><CardContent>
      <ReadState loading={payroll.isLoading} error={payroll.error} retry={payroll.refetch} empty={!payroll.data?.length} />
      {payroll.isSuccess && <ul className="divide-y">{payroll.data.map(row =>
        <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <span dir="ltr">{row.salary_month}</span><strong>{row.net_salary == null ? '—' : formatMoney(row.net_salary, row.currency || 'EGP')}</strong>
          <Badge variant="outline">{salaryLabels[row.status ?? ''] ?? row.status ?? '—'}</Badge>
        </li>)}</ul>}
    </CardContent></Card>}
    {showCommissions && <Card><CardHeader><CardTitle>العمولات الأخيرة</CardTitle></CardHeader><CardContent>
      <ReadState loading={commissions.isLoading} error={commissions.error} retry={commissions.refetch} empty={!commissions.data?.length} />
      {commissions.isSuccess && <ul className="divide-y">{commissions.data.map(row =>
        <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
          <span dir="ltr">{row.commission_date || '—'}</span><strong>{row.commission_amount == null ? '—' : formatMoney(row.commission_amount, row.currency || 'EGP')}</strong>
          <Badge variant="outline">{commissionLabels[row.payment_status ?? ''] ?? row.payment_status ?? '—'}</Badge>
        </li>)}</ul>}
    </CardContent></Card>}
  </div>;
}

export default function EmployeeProfilePage() {
  const { employeeId = '' } = useParams();
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const access = useHrAccess();
  const { canViewTeam, canInviteMembers } = useSupabasePermissions();
  const profile = useQuery({
    queryKey: ['employees', orgId, user?.id, 'profile', employeeId, access.canManagePayroll, access.canManageCommissions],
    enabled: Boolean(orgId && user?.id && access.canViewFiles && !access.loading && UUID.test(employeeId)),
    queryFn: async () => {
      const { data, error } = await supabase.from('employee_directory')
        .select('id, full_name, employee_code, position, department, is_active, hire_date, phone, email, emergency_contact_name, emergency_contact_phone, linked_user_id')
        .eq('organization_id', orgId!).eq('id', employeeId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
  const employee = profile.data;
  usePageTitle(access.canViewFiles && employee ? employee.full_name : 'ملف الموظف');

  return <div dir="rtl" className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
    <Button variant="ghost" size="sm" asChild><Link to="/hr?tab=files"><ArrowRight className="h-4 w-4" />الموظفون</Link></Button>
    {(access.loading || profile.isLoading) ? <p role="status">جارٍ تحميل ملف الموظف…</p>
      : !access.canViewFiles ? <p role="alert">هذا الملف يحتاج صلاحية عرض ملفات الموظفين.</p>
      : profile.isError ? <ReadState loading={false} error={profile.error} retry={profile.refetch} empty={false} />
      : !employee ? <p role="status">ملف الموظف غير متاح في هذه المؤسسة.</p>
      : <>
        <Card><CardContent className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-3 text-primary"><UserRound className="h-6 w-6" /></div>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold sm:text-2xl">{employee.full_name}</h1>
              <p className="text-sm text-muted-foreground">{employee.employee_code}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant={employee.is_active ? 'secondary' : 'outline'}>{employee.is_active ? 'ملف نشط' : 'ملف موقوف'}</Badge>
                <Badge variant="outline">{employee.linked_user_id ? 'مرتبط بحساب دخول' : 'بدون حساب دخول'}</Badge>
              </div>
            </div>
          </div>
          {canViewTeam() && (employee.linked_user_id || canInviteMembers()) && <Button asChild variant="outline" size="sm">
            <Link to={employee.linked_user_id ? `/team?member=${employee.linked_user_id}` : '/team?tab=invitations'}>
              {employee.linked_user_id ? 'إدارة الحساب في فريق العمل' : 'الدعوات في فريق العمل'}
            </Link>
          </Button>}
        </CardContent></Card>
        <Tabs key={`${orgId}:${employee.id}:${access.canViewAttendance}:${access.canManagePayroll}:${access.canManageCommissions}`} defaultValue="details" dir="rtl">
          <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="details"><UserRound className="me-1.5 h-4 w-4" />البيانات</TabsTrigger>
            {access.canViewAttendance && <TabsTrigger value="attendance"><CalendarDays className="me-1.5 h-4 w-4" />الحضور</TabsTrigger>}
            {(access.canManagePayroll || access.canManageCommissions) && <TabsTrigger value="earnings"><Wallet className="me-1.5 h-4 w-4" />المستحقات</TabsTrigger>}
          </TabsList>
          <TabsContent value="details" className="mt-4">
            <Card><CardHeader><CardTitle>بيانات الموظف</CardTitle></CardHeader><CardContent>
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="القسم">{employee.department}</Field><Field label="المنصب">{employee.position}</Field>
                <Field label="تاريخ التوظيف">{employee.hire_date && <span dir="ltr">{employee.hire_date}</span>}</Field>
                <Field label="البريد الإلكتروني">{employee.email && <span className="inline-flex max-w-full items-center gap-1" dir="ltr"><Mail className="h-4 w-4 shrink-0" /><span className="break-all">{employee.email}</span></span>}</Field>
                <Field label="هاتف الموظف">{employee.phone && <span className="inline-flex items-center gap-1" dir="ltr"><Phone className="h-4 w-4" />{employee.phone}</span>}</Field>
                <Field label="جهة اتصال الطوارئ">{[employee.emergency_contact_name, employee.emergency_contact_phone].filter(Boolean).join(' · ')}</Field>
              </dl>
            </CardContent></Card>
          </TabsContent>
          {access.canViewAttendance && <TabsContent value="attendance" className="mt-4"><AttendanceHistory employeeId={employee.id} /></TabsContent>}
          {(access.canManagePayroll || access.canManageCommissions) && <TabsContent value="earnings" className="mt-4">
            <Earnings employeeId={employee.id} showPayroll={access.canManagePayroll} showCommissions={access.canManageCommissions} />
          </TabsContent>}
        </Tabs>
      </>}
  </div>;
}
