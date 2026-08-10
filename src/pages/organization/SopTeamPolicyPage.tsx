import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Users, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import {
  useSopDepartmentMembers,
  useSetSopDepartment,
  useSetSopAvailability,
  useSopPolicy,
  useSaveSopPolicy,
} from '@/hooks/useSop';
import { DEPARTMENT_LABELS } from '@/lib/sop';
import type { SopDepartment } from '@/lib/sop';

const DEPARTMENTS: SopDepartment[] = ['customer_service', 'sales', 'reservations', 'operations', 'management'];
const UNMAPPED = '__unmapped__';

const deptLabel = (d: SopDepartment) => (DEPARTMENT_LABELS as any)?.[d] ?? d;

export default function SopTeamPolicyPage() {
  const { members = [] } = useOrgMembers() as any;
  const { data: deptMembers = [], isLoading } = useSopDepartmentMembers();
  const setDepartment = useSetSopDepartment();
  const setAvailability = useSetSopAvailability();
  const { data: policy } = useSopPolicy();
  const savePolicy = useSaveSopPolicy();

  const rowOf = (userId: string) => deptMembers.find((d) => d.user_id === userId);

  const salesAvailable = deptMembers.filter((d) => d.department === 'sales' && d.is_available).length;

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    [...DEPARTMENTS, UNMAPPED].forEach((k) => map.set(k, []));
    members.forEach((m: any) => {
      const row = deptMembers.find((d) => d.user_id === m.user_id);
      map.get(row?.department ?? UNMAPPED)!.push({ member: m, row });
    });
    return map;
  }, [members, deptMembers]);

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">فريق ودليل العمل (SOP)</h1>
        <p className="text-muted-foreground text-sm mt-1">توزيع الموظفين على الأقسام وضبط سياسات دليل العمل</p>
      </div>

      {salesAvailable === 0 ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>لا يوجد عضو مبيعات متاح</AlertTitle>
          <AlertDescription>
            التوزيع التلقائي (Round Robin) لن يعمل حتى يتم تعيين موظف واحد على الأقل لقسم المبيعات وتحديده كمتاح.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>التوزيع التلقائي جاهز</AlertTitle>
          <AlertDescription>عدد أعضاء المبيعات المتاحين للتوزيع العادل: {salesAvailable}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> توزيع الأقسام</CardTitle>
          <CardDescription>
            غيّر قسم أي موظف مباشرة من القائمة. تغيير القسم لا يغيّر صلاحيات الحساب (المالك/المدير/الموظف) ويُسجَّل في سجل التدقيق.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">جارٍ التحميل...</p>
          ) : (
            [...DEPARTMENTS, UNMAPPED].map((key) => {
              const rows = grouped.get(key) || [];
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">
                      {key === UNMAPPED ? 'غير موزعين على أقسام' : deptLabel(key as SopDepartment)}
                    </h3>
                    <Badge variant="outline">{rows.length}</Badge>
                  </div>
                  {rows.length === 0 ? (
                    <p className="text-xs text-muted-foreground">لا يوجد أعضاء</p>
                  ) : (
                    rows.map(({ member, row }: any) => (
                      <div key={member.user_id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-48">
                          <div className="text-sm font-medium flex items-center gap-2">
                            {member.profile?.full_name || member.profile?.email}
                            <Badge variant="secondary" className="text-[10px]">صلاحية الحساب: {member.role}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {member.profile?.email}
                            {row ? ` • الحمل الحالي: ${row.active_load}` : ''}
                            {row?.last_assigned_at
                              ? ` • آخر إسناد: ${new Date(row.last_assigned_at).toLocaleString('ar-EG')}`
                              : row ? ' • لم يُسند بعد' : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="space-y-1">
                            <Label className="text-xs">قسم دليل العمل</Label>
                            <Select
                              value={row?.department ?? UNMAPPED}
                              onValueChange={(v) =>
                                setDepartment.mutate({
                                  user_id: member.user_id,
                                  department: v === UNMAPPED ? null : (v as SopDepartment),
                                  is_available: row?.is_available ?? true,
                                })
                              }
                            >
                              <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{deptLabel(d)}</SelectItem>)}
                                <SelectItem value={UNMAPPED}>غير موزع</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2 pt-5">
                            <Label className="text-xs">متاح</Label>
                            <Switch
                              disabled={!row}
                              checked={!!row?.is_available}
                              onCheckedChange={(v) => setAvailability.mutate({ user_id: member.user_id, is_available: v })}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <Separator />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>


      <SopPolicyCard policy={policy} onSave={(v) => savePolicy.mutate(v)} saving={savePolicy.isPending} />
    </div>
  );
}

interface PolicyForm {
  assignment_ack_sla_minutes: number;
  first_response_sla_minutes: number;
  incident_update_sla_minutes: number;
  quotation_turnaround_sla_minutes: number;
  default_collection_policy: string;
  default_deposit_percent: number;
  pre_arrival_days: number;
  post_trip_days: number;
  require_management_approval: boolean;
  auto_assign_enabled: boolean;
  approval_required_above_amount: string;
}

const DEFAULTS: PolicyForm = {
  assignment_ack_sla_minutes: 30,
  first_response_sla_minutes: 15,
  incident_update_sla_minutes: 120,
  quotation_turnaround_sla_minutes: 240,
  default_collection_policy: 'full',
  default_deposit_percent: 30,
  pre_arrival_days: 3,
  post_trip_days: 2,
  require_management_approval: true,
  auto_assign_enabled: true,
  approval_required_above_amount: '',
};

function SopPolicyCard({ policy, onSave, saving }: { policy: any; onSave: (v: Record<string, unknown>) => void; saving: boolean }) {
  const [form, setForm] = useState<PolicyForm>(DEFAULTS);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (policy) {
      setForm({
        ...DEFAULTS,
        ...policy,
        approval_required_above_amount:
          policy.approval_required_above_amount === null || policy.approval_required_above_amount === undefined
            ? ''
            : String(policy.approval_required_above_amount),
      });
    }
  }, [policy]);

  const set = (k: keyof PolicyForm, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    const e: Record<string, string> = {};
    const positives: (keyof PolicyForm)[] = [
      'assignment_ack_sla_minutes', 'first_response_sla_minutes', 'incident_update_sla_minutes',
      'quotation_turnaround_sla_minutes', 'pre_arrival_days', 'post_trip_days',
    ];
    positives.forEach((k) => {
      const n = Number(form[k]);
      if (!Number.isFinite(n) || n <= 0) e[k] = 'يجب أن يكون رقمًا أكبر من صفر';
    });
    const dep = Number(form.default_deposit_percent);
    if (!Number.isFinite(dep) || dep < 0 || dep > 100) e.default_deposit_percent = 'النسبة بين 0 و 100';
    if (form.approval_required_above_amount !== '') {
      const a = Number(form.approval_required_above_amount);
      if (!Number.isFinite(a) || a < 0) e.approval_required_above_amount = 'مبلغ غير صالح';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = () => {
    if (!validate()) return;
    onSave({
      assignment_ack_sla_minutes: Number(form.assignment_ack_sla_minutes),
      first_response_sla_minutes: Number(form.first_response_sla_minutes),
      incident_update_sla_minutes: Number(form.incident_update_sla_minutes),
      quotation_turnaround_sla_minutes: Number(form.quotation_turnaround_sla_minutes),
      default_collection_policy: form.default_collection_policy,
      default_deposit_percent: Number(form.default_deposit_percent),
      pre_arrival_days: Number(form.pre_arrival_days),
      post_trip_days: Number(form.post_trip_days),
      require_management_approval: form.require_management_approval,
      approval_required_above_amount:
        form.approval_required_above_amount === '' ? null : Number(form.approval_required_above_amount),
    });
  };

  const num = (k: keyof PolicyForm, label: string) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type="number" value={String(form[k])} onChange={(e) => set(k, e.target.value)} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> سياسات دليل العمل</CardTitle>
        <CardDescription>أوقات الاستجابة، سياسة التحصيل، واعتماد الإدارة</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {num('assignment_ack_sla_minutes', 'مهلة تأكيد الإسناد (دقيقة)')}
          {num('first_response_sla_minutes', 'مهلة أول رد (دقيقة)')}
          {num('quotation_turnaround_sla_minutes', 'مهلة التسعير (دقيقة)')}
          {num('incident_update_sla_minutes', 'مهلة تحديث الشكوى (دقيقة)')}
          {num('pre_arrival_days', 'أيام ما قبل الوصول')}
          {num('post_trip_days', 'أيام ما بعد الرحلة')}
          {num('default_deposit_percent', 'نسبة العربون الافتراضية %')}
          <div className="space-y-1">
            <Label>سياسة التحصيل الافتراضية</Label>
            <Select value={form.default_collection_policy} onValueChange={(v) => set('default_collection_policy', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">سداد كامل</SelectItem>
                <SelectItem value="deposit">عربون</SelectItem>
                <SelectItem value="credit">آجل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.require_management_approval}
              onCheckedChange={(v) => set('require_management_approval', v)}
            />
            <Label>اعتماد الإدارة مطلوب</Label>
          </div>
          <div className="space-y-1">
            <Label>اعتماد الإدارة فوق مبلغ (اختياري)</Label>
            <Input
              type="number"
              placeholder="بدون حد"
              value={form.approval_required_above_amount}
              onChange={(e) => set('approval_required_above_amount', e.target.value)}
            />
            {errors.approval_required_above_amount && (
              <p className="text-xs text-destructive">{errors.approval_required_above_amount}</p>
            )}
          </div>
        </div>

        <Button onClick={submit} disabled={saving}>حفظ السياسات</Button>
      </CardContent>
    </Card>
  );
}
