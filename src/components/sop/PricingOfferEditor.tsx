import { useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown, Lock, Trash2, TrendingUp } from 'lucide-react';
import type { SopPricingOption } from '@/hooks/useSop';
import {
  CANCELLATION_CHARGE_MODELS, CANCELLATION_TYPES, MEAL_PLANS, OTA_SOURCES,
  RECOMMENDATION_REASONS, ROOM_TYPES, ROOM_VIEWS, TRANSFER_STATUSES,
  computePricingMetrics, fromLocalInput, money, pct, toLocalInput,
} from '@/lib/sopPricing';

interface RequestDefaults {
  destination?: string | null;
  check_in?: string | null;
  check_out?: string | null;
}

interface Props {
  option: SopPricingOption;
  defaults: RequestDefaults;
  canViewCosts: boolean;
  onSave: (values: Partial<SopPricingOption>) => void | Promise<unknown>;
  onRecommend: (recommended: boolean) => void;
  onDelete: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}


const Field = ({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">
      {label}{required && <span className="text-destructive"> *</span>}
    </Label>
    {children}
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

const Stat = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => (
  <div className="rounded-md border bg-background p-2">
    <div className="text-[10px] text-muted-foreground">{label}</div>
    <div className={strong ? 'text-sm font-semibold' : 'text-xs font-medium'}>{value}</div>
  </div>
);

/** Fast, uncluttered editor for one pricing offer (max 3 per request). */
export const PricingOfferEditor = ({
  option, defaults, canViewCosts, onSave, onRecommend, onDelete, onDirtyChange,
}: Props) => {
  const [v, setV] = useState<Partial<SopPricingOption>>(option);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [transferOpen, setTransferOpen] = useState(
    !!option.transfer_status && option.transfer_status !== 'not_included',
  );
  const [policyOpen, setPolicyOpen] = useState(false);

  const dirtyRef = useRef(false);
  const markDirty = (next: boolean) => {
    dirtyRef.current = next;
    setDirty(next);
    onDirtyChange?.(next);
  };

  // Only adopt server state when this row has no unsaved input, otherwise a
  // background refetch would silently wipe what the user is typing.
  useEffect(() => {
    if (dirtyRef.current) return;
    setV(option);
  }, [option]);

  // Switching to a different offer always resets the form.
  useEffect(() => {
    markDirty(false);
    setV(option);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [option.id]);

  useEffect(() => () => onDirtyChange?.(false), []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: keyof SopPricingOption, val: unknown) => {
    markDirty(true);
    setV((p) => ({ ...p, [k]: val }));
  };

  const save = async (values: Partial<SopPricingOption> = v) => {
    setSaving(true);
    try {
      await onSave(values);
      markDirty(false);
      setV(values);
    } finally {
      setSaving(false);
    }
  };


  const m = useMemo(() => computePricingMetrics(v, defaults), [v, defaults]);
  const cur = v.currency || 'EGP';

  const errors: string[] = [];
  if (!(v.hotel_name || '').trim()) errors.push('اسم الفندق مطلوب');
  if (!(Number(v.net_cost) > 0)) errors.push('صافي التكلفة مطلوب');
  if (!(Number(v.selling_price) > 0)) errors.push('سعر البيع مطلوب');
  if (!v.cancellation_type && !(v.cancellation_policy || '').trim()) errors.push('سياسة الإلغاء مطلوبة');
  if (!v.price_valid_until) errors.push('«السعر صالح حتى» مطلوب');

  const showTransferDetails = v.transfer_status === 'included' || v.transfer_status === 'optional';

  return (
    <div
      dir="rtl"
      className={`border rounded-lg p-3 space-y-4 ${v.is_recommended ? 'ring-1 ring-primary' : ''}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium">العرض {option.option_index}</span>
          {m.isExpired && <Badge variant="destructive" className="text-[10px]">انتهت الصلاحية</Badge>}
          {dirty && (
            <Badge variant="destructive" className="text-[10px]">تعديلات غير محفوظة</Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs">
            <Switch
              checked={!!v.is_recommended}
              disabled={saving}
              onCheckedChange={(c) => {
                const next = { ...v, is_recommended: c };
                setV(next);
                onRecommend(c);
                void save(next);
              }}
            />
            موصى به {option.is_recommended && !dirty && (
              <Badge variant="secondary" className="text-[10px]">محفوظ</Badge>
            )}
          </label>

          <Button size="icon" variant="ghost" onClick={onDelete} aria-label="حذف العرض">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      {/* Stay details */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="اسم الفندق" required>
          <Input
            list={`hotels-${option.id}`}
            placeholder="مثال: Marriott Mena House"
            value={v.hotel_name || ''}
            onChange={(e) => set('hotel_name', e.target.value)}
          />
        </Field>
        <Field label="الوجهة" hint="مأخوذة من الطلب — عدّلها فقط لو العرض مختلف">
          <Input
            placeholder={defaults.destination || 'الوجهة'}
            value={v.destination ?? ''}
            onChange={(e) => set('destination', e.target.value || null)}
          />
        </Field>
        <Field label="المورد">
          <Input
            placeholder="اسم المورد"
            value={v.supplier_name || ''}
            onChange={(e) => set('supplier_name', e.target.value)}
          />
        </Field>

        <Field label="تاريخ الوصول">
          <Input
            type="date"
            value={(v.check_in || defaults.check_in || '')?.slice(0, 10)}
            onChange={(e) => set('check_in', e.target.value || null)}
          />
        </Field>
        <Field label="تاريخ المغادرة">
          <Input
            type="date"
            value={(v.check_out || defaults.check_out || '')?.slice(0, 10)}
            onChange={(e) => set('check_out', e.target.value || null)}
          />
        </Field>
        <Field label="عدد الليالي">
          <Input readOnly disabled value={m.nights || '—'} />
        </Field>

        <Field label="نوع الغرفة">
          <Input
            list={`roomtypes-${option.id}`}
            placeholder="Double / Suite ..."
            value={v.room_type || ''}
            onChange={(e) => set('room_type', e.target.value || null)}
          />
        </Field>
        <Field label="إطلالة الغرفة">
          <Input
            list={`roomviews-${option.id}`}
            placeholder="Sea View ..."
            value={v.room_view || ''}
            onChange={(e) => set('room_view', e.target.value || null)}
          />
        </Field>
        <Field label="نظام الوجبات">
          <Select
            value={v.meal_plan || ''}
            onValueChange={(val) => set('meal_plan', val || null)}
          >
            <SelectTrigger><SelectValue placeholder="اختر النظام" /></SelectTrigger>
            <SelectContent>
              {MEAL_PLANS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              <SelectItem value="OTHER">أخرى</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field label="عدد الغرف">
          <Input
            type="number" min={1} placeholder="1"
            value={v.rooms_count ?? ''}
            onChange={(e) => set('rooms_count', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="العملة" required>
          <Input value={cur} onChange={(e) => set('currency', e.target.value)} />
        </Field>
        <Field label="السعر صالح حتى" required>
          <Input
            type="datetime-local"
            value={toLocalInput(v.price_valid_until)}
            onChange={(e) => set('price_valid_until', fromLocalInput(e.target.value))}
          />
        </Field>

        <datalist id={`hotels-${option.id}`} />
        <datalist id={`roomtypes-${option.id}`}>
          {ROOM_TYPES.map((r) => <option key={r} value={r} />)}
        </datalist>
        <datalist id={`roomviews-${option.id}`}>
          {ROOM_VIEWS.map((r) => <option key={r} value={r} />)}
        </datalist>
      </div>

      <Separator />

      {/* Customer-facing price comparison */}
      <section className="space-y-3 rounded-md border border-primary/30 bg-primary/5 p-3">
        <h4 className="text-xs font-semibold">مقارنة الأسعار للعميل</h4>
        <div className="grid gap-3 sm:grid-cols-4">
          <Field label="سعر Vogatchi (إجمالي)" required>
            <Input
              type="number" inputMode="decimal" placeholder="0.00"
              value={v.selling_price ?? ''}
              onChange={(e) => set('selling_price', Number(e.target.value))}
            />
          </Field>
          <Field label="سعر المقارنة (OTA)">
            <Input
              type="number" inputMode="decimal" placeholder="0.00"
              value={v.ota_price ?? ''}
              onChange={(e) => set('ota_price', e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
          <Field label="مصدر المقارنة">
            <Select
              value={v.ota_source || (v.ota_price ? 'booking.com' : '')}
              onValueChange={(val) => set('ota_source', val)}
            >
              <SelectTrigger><SelectValue placeholder="Booking.com" /></SelectTrigger>
              <SelectContent>
                {OTA_SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="سعر الفندق المباشر">
            <Input
              type="number" inputMode="decimal" placeholder="0.00"
              value={v.hotel_direct_price ?? ''}
              onChange={(e) => set('hotel_direct_price', e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
        </div>

        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          <Stat label="سعر Vogatchi / ليلة" value={money(m.vogatchiPerNight, cur)} strong />
          <Stat label="سعر OTA / ليلة" value={money(m.otaPerNight, cur)} />
          <Stat label="سعر الفندق / ليلة" value={money(m.hotelDirectPerNight, cur)} />
          <Stat
            label="التوفير مقابل OTA"
            value={m.savingVsOta === null ? '—' : `${money(m.savingVsOta, cur)} (${pct(m.savingVsOtaPct)})`}
            strong
          />
          <Stat
            label="التوفير مقابل الفندق المباشر"
            value={m.savingVsDirect === null ? '—' : `${money(m.savingVsDirect, cur)} (${pct(m.savingVsDirectPct)})`}
          />
        </div>
      </section>

      {/* Internal profitability */}
      {canViewCosts && (
        <section className="space-y-3 rounded-md border border-dashed p-3">
          <h4 className="text-xs font-semibold flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5" /> بيانات داخلية — الحجوزات والإدارة فقط
          </h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="صافي التكلفة (المورد)" required>
              <Input
                type="number" inputMode="decimal" placeholder="0.00"
                value={v.net_cost ?? ''}
                onChange={(e) => set('net_cost', Number(e.target.value))}
              />
            </Field>
            <Field label="موعد السداد للمورد">
              <Input
                type="date"
                value={v.payment_deadline?.slice(0, 10) || ''}
                onChange={(e) => set('payment_deadline', e.target.value || null)}
              />
            </Field>
          </div>
          <div className="grid gap-2 grid-cols-3">
            <Stat label="الربح الإجمالي" value={money(m.grossProfit, cur)} strong />
            <Stat label="هامش الربح %" value={pct(m.marginPct)} />
            <Stat label="نسبة الماركب %" value={pct(m.markupPct)} />
          </div>
          <Field label="ملاحظات داخلية (لا تظهر للمبيعات ولا للعميل)">
            <Textarea
              rows={2} value={v.internal_notes || ''}
              onChange={(e) => set('internal_notes', e.target.value || null)}
            />
          </Field>
        </section>
      )}

      {/* Cancellation policy */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="نوع سياسة الإلغاء" required>
          <Select value={v.cancellation_type || ''} onValueChange={(val) => set('cancellation_type', val)}>
            <SelectTrigger><SelectValue placeholder="اختر النوع" /></SelectTrigger>
            <SelectContent>
              {CANCELLATION_TYPES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {v.cancellation_type === 'free' && (
          <Field label="إلغاء مجاني حتى">
            <Input
              type="datetime-local"
              value={toLocalInput(v.free_cancellation_until)}
              onChange={(e) => set('free_cancellation_until', fromLocalInput(e.target.value))}
            />
          </Field>
        )}
        {(v.cancellation_type === 'partial' || v.cancellation_type === 'custom' || v.cancellation_type === 'free') && (
          <>
            <Field label="طريقة احتساب الغرامة">
              <Select
                value={v.cancellation_charge_model || ''}
                onValueChange={(val) => set('cancellation_charge_model', val)}
              >
                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                <SelectContent>
                  {CANCELLATION_CHARGE_MODELS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {(v.cancellation_charge_model === 'fixed' || v.cancellation_charge_model === 'percent') && (
              <Field label={v.cancellation_charge_model === 'percent' ? 'قيمة الغرامة %' : `قيمة الغرامة ${cur}`}>
                <Input
                  type="number" inputMode="decimal"
                  value={v.cancellation_charge_value ?? ''}
                  onChange={(e) => set('cancellation_charge_value', e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
            )}
          </>
        )}
      </div>

      <Collapsible open={policyOpen} onOpenChange={setPolicyOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1">
            <ChevronDown className={`h-3.5 w-3.5 transition ${policyOpen ? 'rotate-180' : ''}`} />
            نص سياسة الإلغاء وملاحظاتها
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-3 pt-2">
          <Field label="نص السياسة كما وردت من المورد">
            <Textarea
              rows={2} value={v.cancellation_policy || ''}
              onChange={(e) => set('cancellation_policy', e.target.value)}
            />
          </Field>
          <Field label="ملاحظات على الإلغاء">
            <Textarea
              rows={2} value={v.cancellation_notes || ''}
              onChange={(e) => set('cancellation_notes', e.target.value || null)}
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="آخر موعد للإلغاء">
              <Input
                type="date" value={v.cancellation_deadline?.slice(0, 10) || ''}
                onChange={(e) => set('cancellation_deadline', e.target.value || null)}
              />
            </Field>
            <Field label="موعد الإفراج (Release)">
              <Input
                type="date" value={v.release_deadline?.slice(0, 10) || ''}
                onChange={(e) => set('release_deadline', e.target.value || null)}
              />
            </Field>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Transfer */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="الانتقالات">
          <Select
            value={v.transfer_status || 'not_included'}
            onValueChange={(val) => { set('transfer_status', val); setTransferOpen(val !== 'not_included'); }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TRANSFER_STATUSES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
      {showTransferDetails && (
        <Collapsible open={transferOpen} onOpenChange={setTransferOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-[11px] gap-1">
              <ChevronDown className={`h-3.5 w-3.5 transition ${transferOpen ? 'rotate-180' : ''}`} />
              تفاصيل الانتقالات
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="grid gap-3 sm:grid-cols-2 pt-2">
            <Field label="نوع الانتقال">
              <Input
                placeholder="مطار - فندق / خاص"
                value={v.transfer_type || ''}
                onChange={(e) => set('transfer_type', e.target.value || null)}
              />
            </Field>
            <Field label="سعر بيع الانتقالات">
              <Input
                type="number" inputMode="decimal"
                value={v.transfer_selling_price ?? ''}
                onChange={(e) => set('transfer_selling_price', e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
            {canViewCosts && (
              <Field label="تكلفة الانتقالات (داخلي)">
                <Input
                  type="number" inputMode="decimal"
                  value={v.transfer_net_cost ?? ''}
                  onChange={(e) => set('transfer_net_cost', e.target.value ? Number(e.target.value) : null)}
                />
              </Field>
            )}
            <Field label="ملاحظات الانتقالات">
              <Input
                value={v.transfer_notes || ''}
                onChange={(e) => set('transfer_notes', e.target.value || null)}
              />
            </Field>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Recommendation + sales notes */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="سبب التوصية">
          <Select
            value={v.recommendation_reason || ''}
            onValueChange={(val) => set('recommendation_reason', val)}
          >
            <SelectTrigger><SelectValue placeholder="اختر السبب" /></SelectTrigger>
            <SelectContent>
              {RECOMMENDATION_REASONS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="ملاحظة على التوصية">
          <Input
            value={v.recommendation_note || ''}
            onChange={(e) => set('recommendation_note', e.target.value || null)}
          />
        </Field>
      </div>
      <Field label="ملاحظات للمبيعات (تظهر لفريق المبيعات)">
        <Textarea rows={2} value={v.notes || ''} onChange={(e) => set('notes', e.target.value || null)} />
      </Field>

      {errors.length > 0 && (
        <ul className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-[11px] space-y-1">
          {errors.map((e) => <li key={e}>• {e}</li>)}
        </ul>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5" /> الحسابات تتحدث فورياً أثناء الإدخال
        </span>
        <Button size="sm" variant="outline" onClick={() => onSave(v)}>حفظ العرض</Button>
      </div>
    </div>
  );
};

export default PricingOfferEditor;
