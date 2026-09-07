import { useEffect, useMemo, useState } from 'react';
import { KeyRound, LockKeyhole, Plus, ShieldCheck, Users } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useOrganizationPermissionRoles, type PermissionDataScope } from '@/hooks/useOrganizationPermissionRoles';

const MODULE_LABELS: Record<string, string> = {
  customers: 'العملاء',
  bookings: 'الحجوزات',
  invoices: 'الفواتير',
  suppliers: 'الموردون',
  reports: 'التقارير',
  employees: 'الموظفون',
  expenses: 'المصروفات',
  banking: 'البنوك',
  crm: 'إدارة العملاء',
  payments: 'المدفوعات',
  team: 'الفريق',
  financial: 'المالية',
  customer_service: 'خدمة العملاء',
  customer_portal: 'بوابة العميل',
  whatsapp: 'واتساب',
  admin: 'إدارة المؤسسة',
  automation: 'الأتمتة',
  audit: 'التدقيق',
  documents: 'المستندات',
  quotes: 'عروض الأسعار',
  marketing: 'التسويق',
  system: 'النظام',
};

const SCOPE_LABELS: Record<PermissionDataScope, string> = {
  none: 'بدون نطاق',
  own: 'سجلاتي فقط',
  team: 'الفريق',
  branch: 'الفرع',
  organization: 'كل المؤسسة',
};

const roleLabel = (role: string) => ({
  owner: 'مالك',
  admin: 'مدير نظام',
  manager: 'مدير',
  agent: 'موظف',
  viewer: 'مشاهد',
}[role] ?? role);

export default function OrganizationRolesPage() {
  const {
    roles,
    catalog,
    members,
    isLoading,
    error,
    createRole,
    setGrant,
    assignRole,
    isCreating,
    isUpdating,
  } = useOrganizationPermissionRoles();
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [inheritsBaseRole, setInheritsBaseRole] = useState(false);

  useEffect(() => {
    if (!selectedRoleId && roles.length) setSelectedRoleId(roles[0].id);
    if (selectedRoleId && !roles.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId(roles[0]?.id ?? '');
    }
  }, [roles, selectedRoleId]);

  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? null;
  const grantMap = useMemo(
    () => new Map((selectedRole?.grants ?? []).map((grant) => [grant.permission_key, grant])),
    [selectedRole],
  );
  const groupedCatalog = useMemo(() => catalog.reduce<Record<string, typeof catalog>>((groups, entry) => {
    (groups[entry.module] ??= []).push(entry);
    return groups;
  }, {}), [catalog]);

  const handleCreateRole = () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) return;
    createRole({ name: trimmedName, description: description.trim(), inheritsBaseRole });
    setName('');
    setDescription('');
    setInheritsBaseRole(false);
  };

  const setPermission = (permissionKey: string, granted: boolean, dataScope: PermissionDataScope) => {
    if (!selectedRoleId) return;
    setGrant({ roleId: selectedRoleId, permissionKey, granted, dataScope });
  };

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-primary/10 p-3 text-primary"><ShieldCheck className="h-6 w-6" /></div>
        <div>
          <h1 className="text-2xl font-bold">الأدوار والصلاحيات الخاصة بالمؤسسة</h1>
          <p className="text-sm text-muted-foreground mt-1">
            أنشئ أدوارًا تناسب هيكل شركتك، واربطها بالأقسام والفروع من غير تغيير الأدوار الأساسية للنظام.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTitle>تعذر تحميل إعدادات الأدوار</AlertTitle>
          <AlertDescription>تأكد من تطبيق تحديث الصلاحيات على قاعدة البيانات ثم أعد تحميل الصفحة.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-4 w-4" />دور جديد</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">اسم الدور</Label>
              <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="مثال: مشرف الحجوزات" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">الوصف</Label>
              <Textarea id="role-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="ما الذي يستطيع هذا الدور فعله؟" rows={3} />
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox checked={inheritsBaseRole} onCheckedChange={(checked) => setInheritsBaseRole(checked === true)} />
              <span>يحتفظ بصلاحيات الدور الأساسي أيضًا</span>
            </label>
            <Button className="w-full" onClick={handleCreateRole} disabled={isCreating || name.trim().length < 2}>
              <Plus className="h-4 w-4 ml-2" />{isCreating ? 'جاري الإنشاء...' : 'إنشاء الدور'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><KeyRound className="h-4 w-4" />صلاحيات الدور</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">الصلاحية غير المحددة تكون مرفوضة في الدور المخصص، إلا إذا فعّلت وراثة الدور الأساسي.</p>
            </div>
            <Select value={selectedRoleId} onValueChange={setSelectedRoleId} disabled={!roles.length}>
              <SelectTrigger className="w-56"><SelectValue placeholder="اختر دورًا" /></SelectTrigger>
              <SelectContent>
                {roles.map((role) => <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {!selectedRole && !isLoading && <p className="text-sm text-muted-foreground">أنشئ أول دور مخصص لبدء ضبط الصلاحيات.</p>}
            {selectedRole && (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Badge variant="secondary">{selectedRole.assigned_user_count} أعضاء</Badge>
                  {selectedRole.inherits_base_role && <Badge variant="outline">يرث الدور الأساسي</Badge>}
                  {selectedRole.description && <span className="text-muted-foreground">{selectedRole.description}</span>}
                </div>
                {Object.entries(groupedCatalog).map(([module, entries]) => (
                  <div key={module} className="rounded-lg border p-4 space-y-3">
                    <h3 className="font-semibold">{MODULE_LABELS[module] ?? module}</h3>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {entries.map((entry) => {
                        const grant = grantMap.get(entry.permission_key);
                        const checked = grant?.granted === true;
                        const scope = checked ? grant?.data_scope ?? entry.default_scope : 'none';
                        return (
                          <div key={entry.permission_key} className="flex items-center justify-between gap-2 rounded-md bg-muted/30 p-2">
                            <label className="flex min-w-0 items-center gap-2 text-sm cursor-pointer">
                              <Checkbox checked={checked} disabled={isUpdating} onCheckedChange={(value) => setPermission(entry.permission_key, value === true, entry.default_scope)} />
                              <span className="truncate" title={entry.permission_key}>{entry.label_ar}</span>
                              {entry.is_sensitive && <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-amber-600" />}
                            </label>
                            {checked && (
                              <Select value={scope} onValueChange={(value) => setPermission(entry.permission_key, true, value as PermissionDataScope)} disabled={isUpdating}>
                                <SelectTrigger className="h-7 w-28 text-[11px]"><SelectValue /></SelectTrigger>
                                <SelectContent>{(['own', 'team', 'branch', 'organization'] as PermissionDataScope[]).map((value) => <SelectItem key={value} value={value}>{SCOPE_LABELS[value]}</SelectItem>)}</SelectContent>
                              </Select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div><CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" />تعيين الدور للأعضاء</CardTitle><p className="text-xs text-muted-foreground mt-1">يمكن للعضو حمل أكثر من دور مخصص، وتُطبّق صلاحياته الأقوى مع احترام المنع الصريح.</p></div>
          <Badge variant="outline">الدور المحدد: {selectedRole?.name ?? '—'}</Badge>
        </CardHeader>
        <CardContent>
          {!selectedRole && <p className="text-sm text-muted-foreground">اختر دورًا أولًا.</p>}
          {selectedRole && <div className="divide-y rounded-lg border">
            {members.map((member) => {
              const assigned = member.assigned_role_ids.includes(selectedRole.id);
              return (
                <label key={member.user_id} className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-muted/30">
                  <div className="min-w-0"><p className="font-medium truncate">{member.full_name || member.email || 'عضو بدون اسم'}</p><p className="text-xs text-muted-foreground">{member.email} · {roleLabel(member.base_role)}</p></div>
                  <Checkbox checked={assigned} disabled={isUpdating} onCheckedChange={(value) => assignRole({ userId: member.user_id, roleId: selectedRole.id, assigned: value === true })} />
                </label>
              );
            })}
            {!members.length && <p className="p-4 text-sm text-muted-foreground">لا يوجد أعضاء نشطون.</p>}
          </div>}
        </CardContent>
      </Card>
    </div>
  );
}
