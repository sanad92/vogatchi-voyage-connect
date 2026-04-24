import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, ArrowRight, Check, Crown, Shield, Briefcase, UserCheck, Eye, Info } from 'lucide-react';
import { useTeamManagement, NewTeamMemberInput } from '@/hooks/useTeamManagement';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const ROLES = [
  { value: 'admin', label: 'مدير', desc: 'صلاحية كاملة على المؤسسة عدا التحكم بالاشتراك', icon: Shield },
  { value: 'manager', label: 'مشرف', desc: 'إدارة الحجوزات والعملاء والتقارير', icon: Briefcase },
  { value: 'agent', label: 'موظف', desc: 'إنشاء حجوزات وعرض العملاء', icon: UserCheck },
  { value: 'viewer', label: 'مشاهد', desc: 'عرض البيانات فقط بدون تعديل', icon: Eye },
] as const;

const STEPS = ['المعلومات الأساسية', 'الدور والصلاحيات', 'بيانات الموظف (اختياري)'];

const AddTeamMemberWizard = ({ open, onOpenChange }: Props) => {
  const { addMember } = useTeamManagement();
  const [step, setStep] = useState(0);

  const [form, setForm] = useState<NewTeamMemberInput>({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    org_role: 'agent',
    employee_data: { position: '', department: '', base_salary: 0, hire_date: '' },
  });

  const reset = () => {
    setStep(0);
    setForm({
      email: '', password: '', full_name: '', phone: '',
      org_role: 'agent',
      employee_data: { position: '', department: '', base_salary: 0, hire_date: '' },
    });
  };

  const close = () => { reset(); onOpenChange(false); };

  const validateStep = (): string | null => {
    if (step === 0) {
      if (!form.full_name.trim()) return 'الاسم مطلوب';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'بريد إلكتروني غير صالح';
      if (form.password.length < 8) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    }
    return null;
  };

  const next = () => {
    const err = validateStep();
    if (err) { import('sonner').then(({ toast }) => toast.error(err)); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const back = () => setStep((s) => Math.max(s - 1, 0));

  const submit = async () => {
    const hasHR =
      !!form.employee_data?.position?.trim() ||
      !!form.employee_data?.department?.trim() ||
      Number(form.employee_data?.base_salary) > 0 ||
      !!form.employee_data?.hire_date;

    const payload: NewTeamMemberInput = {
      ...form,
      employee_data: hasHR
        ? {
            position: form.employee_data?.position?.trim() || undefined,
            department: form.employee_data?.department?.trim() || undefined,
            base_salary: Number(form.employee_data?.base_salary) || 0,
            hire_date: form.employee_data?.hire_date || undefined,
          }
        : undefined,
    };
    const res = await addMember.mutateAsync(payload);
    if (res?.success) close();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(v) : close())}>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle>إضافة عضو جديد للفريق</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                i < step ? 'bg-primary text-primary-foreground' :
                i === step ? 'bg-primary text-primary-foreground ring-4 ring-primary/20' :
                'bg-muted text-muted-foreground'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`mr-2 text-xs ${i === step ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                {label}
              </span>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border mx-2" />}
            </div>
          ))}
        </div>

        <div className="min-h-[280px] py-4">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <Label>الاسم الكامل *</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="مثال: أحمد محمد" />
              </div>
              <div>
                <Label>البريد الإلكتروني *</Label>
                <Input type="email" dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="user@example.com" />
              </div>
              <div>
                <Label>رقم الهاتف</Label>
                <Input dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" />
              </div>
              <div>
                <Label>كلمة المرور الأولية *</Label>
                <Input type="text" dir="ltr" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8 أحرف على الأقل" />
                <p className="text-xs text-muted-foreground mt-1">يمكن للعضو تغييرها لاحقاً.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">اختر دور هذا العضو في المؤسسة:</p>
              {ROLES.map((r) => {
                const Icon = r.icon;
                const selected = form.org_role === r.value;
                return (
                  <Card
                    key={r.value}
                    className={`cursor-pointer transition-all ${selected ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'hover:border-primary/50'}`}
                    onClick={() => setForm({ ...form, org_role: r.value as any })}
                  >
                    <CardContent className="flex items-center gap-3 p-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.desc}</p>
                      </div>
                      {selected && <Check className="w-5 h-5 text-primary" />}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-start gap-2 p-3 rounded-lg border bg-primary/5 border-primary/20">
                <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground">
                  سيتم إنشاء سجل موظف تلقائياً مرتبط بحساب المستخدم. أكمل البيانات الآن أو اتركها فارغة وعدّلها لاحقاً من قسم الموارد البشرية.
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>المنصب</Label>
                    <Input
                      value={form.employee_data?.position || ''}
                      onChange={(e) => setForm({ ...form, employee_data: { ...form.employee_data, position: e.target.value } })}
                      placeholder="مثال: محاسب"
                    />
                  </div>
                  <div>
                    <Label>القسم</Label>
                    <Input
                      value={form.employee_data?.department || ''}
                      onChange={(e) => setForm({ ...form, employee_data: { ...form.employee_data, department: e.target.value } })}
                      placeholder="مثال: المالية"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>الراتب الأساسي</Label>
                    <Input
                      type="number"
                      value={form.employee_data?.base_salary || ''}
                      onChange={(e) => setForm({ ...form, employee_data: { ...form.employee_data, base_salary: Number(e.target.value) } })}
                    />
                  </div>
                  <div>
                    <Label>تاريخ التوظيف</Label>
                    <Input
                      type="date"
                      value={form.employee_data?.hire_date || ''}
                      onChange={(e) => setForm({ ...form, employee_data: { ...form.employee_data, hire_date: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-2 border-t">
          <Button variant="outline" onClick={step === 0 ? close : back} disabled={addMember.isPending}>
            {step === 0 ? 'إلغاء' : (<><ArrowRight className="w-4 h-4 ml-1" /> رجوع</>)}
          </Button>

          {step < STEPS.length - 1 ? (
            <Button onClick={next}>
              التالي <ArrowLeft className="w-4 h-4 mr-1" />
            </Button>
          ) : (
            <Button onClick={submit} disabled={addMember.isPending}>
              {addMember.isPending ? 'جاري الحفظ...' : 'إضافة العضو'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AddTeamMemberWizard;
