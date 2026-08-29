import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useSaveSopLead, type SopLead } from '@/hooks/useSop';
import { toast } from 'sonner';

interface Props {
  lead?: SopLead | null;
  defaults?: Partial<SopLead>;
  onSaved?: (lead: SopLead) => void;
}

const REQUIRED = [
  'contact_name', 'contact', 'destination', 'dates', 'adults',
  'budget', 'priorities', 'lead_source',
] as const;

/** CS intake form — mirrors the mandatory intake fields enforced by the database. */
export const LeadIntakeForm = ({ lead, defaults, onSaved }: Props) => {
  const save = useSaveSopLead();
  const [form, setForm] = useState<Partial<SopLead>>({
    children_count: 0,
    children_ages: [],
    service_type: 'hotel',
    payment_policy: 'full',
    budget_currency: 'EGP',
    ...defaults,
  });

  useEffect(() => {
    if (lead) setForm(lead);
  }, [lead]);

  const set = (k: keyof SopLead, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const filled = {
    contact_name: !!form.contact_name,
    contact: !!(form.contact_phone || form.contact_email),
    destination: !!(form.destination || form.city),
    dates: !!(form.check_in || form.approx_dates),
    adults: !!form.adults && form.adults > 0,
    budget: !!(form.budget_level || form.budget_amount),
    priorities: !!form.priorities,
    lead_source: !!form.lead_source,
  };
  const doneCount = REQUIRED.filter((k) => filled[k]).length;
  const pct = Math.round((doneCount / REQUIRED.length) * 100);

  const submit = () => {
    if (form.check_in && form.check_out && form.check_out < form.check_in) {
      toast.error('تاريخ المغادرة يجب ألا يسبق تاريخ الوصول');
      return;
    }
    const ages = Array.isArray(form.children_ages) ? form.children_ages : [];
    save.mutate(
      { ...form, children_ages: ages },
      { onSuccess: (l) => onSaved?.(l) },
    );
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
          <span>اكتمال بيانات الاستقبال</span>
          <span>{pct}%</span>
        </div>
        <Progress value={pct} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="اسم العميل *">
          <Input value={form.contact_name || ''} onChange={(e) => set('contact_name', e.target.value)} />
        </Field>
        <Field label="رقم الهاتف *">
          <Input type="tel" dir="ltr" value={form.contact_phone || ''} onChange={(e) => set('contact_phone', e.target.value)} />
        </Field>
        <Field label="البريد الإلكتروني">
          <Input type="email" dir="ltr" value={form.contact_email || ''} onChange={(e) => set('contact_email', e.target.value)} />
        </Field>
        <Field label="نوع الخدمة">
          <Select value={form.service_type || 'hotel'} onValueChange={(v) => set('service_type', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="hotel">فندق</SelectItem>
              <SelectItem value="flight">طيران</SelectItem>
              <SelectItem value="package">باقة</SelectItem>
              <SelectItem value="transport">انتقالات</SelectItem>
              <SelectItem value="other">أخرى</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="الوجهة *">
          <Input value={form.destination || ''} onChange={(e) => set('destination', e.target.value)} />
        </Field>
        <Field label="المدينة">
          <Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} />
        </Field>
        <Field label="تاريخ الوصول">
          <Input type="date" value={form.check_in || ''} onChange={(e) => set('check_in', e.target.value || null)} />
        </Field>
        <Field label="تاريخ المغادرة">
          <Input type="date" value={form.check_out || ''} onChange={(e) => set('check_out', e.target.value || null)} />
        </Field>
        <Field label="تواريخ تقريبية (بديل)">
          <Input value={form.approx_dates || ''} onChange={(e) => set('approx_dates', e.target.value)} placeholder="مثال: أول أسبوع في سبتمبر" />
        </Field>
        <Field label="عدد البالغين *">
          <Input type="number" min={1} value={form.adults ?? ''} onChange={(e) => set('adults', Number(e.target.value) || null)} />
        </Field>
        <Field label="عدد الأطفال">
          <Input
            type="number" min={0} value={form.children_count ?? 0}
            onChange={(e) => {
              const n = Number(e.target.value) || 0;
              const ages = Array.from({ length: n }, (_, i) => (form.children_ages as number[])?.[i] ?? 0);
              setForm((f) => ({ ...f, children_count: n, children_ages: ages }));
            }}
          />
        </Field>
        <Field label="أعمار الأطفال">
          <div className="flex gap-2 flex-wrap">
            {Array.from({ length: form.children_count || 0 }).map((_, i) => (
              <Input
                key={i} type="number" min={0} max={17} className="w-16"
                value={(form.children_ages as number[])?.[i] ?? ''}
                onChange={(e) => {
                  const ages = [...((form.children_ages as number[]) || [])];
                  ages[i] = Number(e.target.value) || 0;
                  set('children_ages', ages);
                }}
              />
            ))}
            {!form.children_count && <span className="text-xs text-muted-foreground">لا يوجد</span>}
          </div>
        </Field>
        <Field label="عدد الغرف">
          <Input type="number" min={1} value={form.rooms ?? ''} onChange={(e) => set('rooms', Number(e.target.value) || null)} />
        </Field>
        <Field label="التوزيع (Occupancy)">
          <Input value={form.occupancy || ''} onChange={(e) => set('occupancy', e.target.value)} placeholder="2 بالغ + طفل" />
        </Field>
        <Field label="مستوى الخدمة / الميزانية *">
          <Select value={form.budget_level || ''} onValueChange={(v) => set('budget_level', v)}>
            <SelectTrigger><SelectValue placeholder="اختر المستوى" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="economy">اقتصادي</SelectItem>
              <SelectItem value="mid">متوسط</SelectItem>
              <SelectItem value="premium">مميز</SelectItem>
              <SelectItem value="luxury">فاخر</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="الميزانية التقريبية">
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              className="flex-1"
              value={form.budget_amount ?? ''}
              onChange={(e) => set('budget_amount', Number(e.target.value) || null)}
            />
            <Select value={form.budget_currency || 'EGP'} onValueChange={(v) => set('budget_currency', v)}>
              <SelectTrigger className="w-24" dir="ltr"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EGP">EGP</SelectItem>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="SAR">SAR</SelectItem>
                <SelectItem value="AED">AED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Field>
        <Field label="الجنسية">
          <Input value={form.nationality || ''} onChange={(e) => set('nationality', e.target.value)} />
        </Field>
        <Field label="السوق">
          <Input value={form.market || ''} onChange={(e) => set('market', e.target.value)} />
        </Field>
        <Field label="مصدر العميل *">
          <Select value={form.lead_source || ''} onValueChange={(v) => set('lead_source', v)}>
            <SelectTrigger><SelectValue placeholder="اختر المصدر" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="whatsapp">واتساب</SelectItem>
              <SelectItem value="website">الموقع</SelectItem>
              <SelectItem value="facebook">فيسبوك</SelectItem>
              <SelectItem value="instagram">إنستجرام</SelectItem>
              <SelectItem value="referral">ترشيح</SelectItem>
              <SelectItem value="walk_in">زيارة مباشرة</SelectItem>
              <SelectItem value="repeat">عميل متكرر</SelectItem>
              <SelectItem value="phone">مكالمة</SelectItem>
              <SelectItem value="other">أخرى</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="الحملة">
          <Input value={form.campaign || ''} onChange={(e) => set('campaign', e.target.value)} />
        </Field>
        <Field label="فندق / باقة مرجعية">
          <Input value={form.reference_hotel || ''} onChange={(e) => set('reference_hotel', e.target.value)} />
        </Field>
        <Field label="رابط صورة العرض المرجعي">
          <Input value={form.reference_screenshot_url || ''} onChange={(e) => set('reference_screenshot_url', e.target.value)} />
        </Field>
        <Field label="سياسة الدفع">
          <Select value={form.payment_policy || 'full'} onValueChange={(v) => set('payment_policy', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="full">سداد كامل</SelectItem>
              <SelectItem value="deposit">دفعة مقدمة</SelectItem>
              <SelectItem value="credit">آجل (ائتمان)</SelectItem>
              <SelectItem value="exception">استثناء معتمد</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        {form.payment_policy === 'deposit' && (
          <Field label="نسبة الدفعة المقدمة %">
            <Input type="number" min={1} max={100} value={form.deposit_percent ?? ''} onChange={(e) => set('deposit_percent', Number(e.target.value) || null)} />
          </Field>
        )}
      </div>

      <Field label="أولويات العميل *">
        <Textarea rows={2} value={form.priorities || ''} onChange={(e) => set('priorities', e.target.value)}
          placeholder="السعر، الموقع، الإفطار، قرب الحرم..." />
      </Field>
      <Field label="طلبات خاصة">
        <Textarea rows={2} value={form.special_requests || ''} onChange={(e) => set('special_requests', e.target.value)} />
      </Field>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={save.isPending}>
          {pct === 100 ? 'حفظ وإكمال الاستقبال' : 'حفظ كمسودة'}
        </Button>
      </div>
    </div>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    {children}
  </div>
);

export default LeadIntakeForm;
