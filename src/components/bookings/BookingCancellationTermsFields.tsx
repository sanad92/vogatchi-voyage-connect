import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  emptyPolicy, emptyTerms, formatPolicyDeadline, policyLabels, previousCalendarDay,
  type BookingCancellationTerms, type CancellationPolicy, type FeeKind, type PolicyKind,
} from '@/lib/bookingCancellationTerms';

const intl = Intl as typeof Intl & { supportedValuesOf?: (key: 'timeZone') => string[] };
const timeZones = [...new Set(['Africa/Cairo', 'Asia/Riyadh', 'Asia/Dubai', 'Europe/Istanbul', 'UTC',
  ...(intl.supportedValuesOf?.('timeZone') ?? []),
])];

function PolicyFields({ label, value, onChange, currency }: {
  label: string; value: CancellationPolicy; onChange: (next: CancellationPolicy) => void; currency: string;
}) {
  const id = useId();
  return (
    <fieldset className="space-y-3 rounded-md border p-3">
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      <div className="space-y-1">
        <Label htmlFor={id + '-kind'}>نوع سياسة الإلغاء</Label>
        <select id={id + '-kind'} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.kind}
          onChange={event => {
            const kind = event.target.value as PolicyKind;
            onChange(kind === 'non_refundable' ? { ...emptyPolicy, kind, value: '100' } : { ...emptyPolicy, kind });
          }}>
          {Object.entries(policyLabels).map(([key, name]) => <option key={key} value={key}>{name}</option>)}
        </select>
      </div>
      {value.kind === 'free_until' && (
        <div className="space-y-1">
          <Label htmlFor={id + '-free'}>آخر موعد للإلغاء المجاني</Label>
          <Input id={id + '-free'} type="datetime-local" dir="ltr" value={value.free_until}
            onChange={event => onChange({ ...value, free_until: event.target.value })} />
        </div>
      )}
      {value.kind !== 'pending' && (
        <FeeFields id={id + '-base'} unit={value.unit} value={value.value} currency={currency}
          label={value.kind === 'free_until' ? 'الغرامة بعد الموعد' : value.kind === 'non_refundable' ? 'القيمة غير القابلة للاسترداد' : 'غرامة الإلغاء'}
          onChange={(unit, amount) => onChange({ ...value, unit, value: amount })} />
      )}
      {value.rules.map((rule, index) => (
        <div className="space-y-2 border-t pt-2" key={index}>
          <Label htmlFor={id + '-rule-' + index}>بدء مرحلة الغرامة</Label>
          <Input id={id + '-rule-' + index} type="datetime-local" dir="ltr" value={rule.from}
            onChange={event => onChange({ ...value, rules: value.rules.map((r, i) => i === index ? { ...r, from: event.target.value } : r) })} />
          <FeeFields id={id + '-fee-' + index} unit={rule.unit} value={rule.value} currency={currency} label="غرامة الإلغاء"
            onChange={(unit, amount) => onChange({ ...value, rules: value.rules.map((r, i) => i === index ? { ...r, unit, value: amount } : r) })} />
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange({ ...value, rules: value.rules.filter((_, i) => i !== index) })}>إزالة المرحلة</Button>
        </div>
      ))}
      {(value.kind === 'free_until' || value.kind === 'penalty') && value.rules.length < 10 && (
        <Button type="button" size="sm" variant="outline" onClick={() => onChange({
          ...value, rules: [...value.rules, { from: '', unit: 'percent', value: '' }],
        })}>إضافة مرحلة غرامة</Button>
      )}
    </fieldset>
  );
}

function FeeFields({ id, label, currency, unit, value, onChange }: {
  id: string; label: string; currency: string; unit: FeeKind; value: string;
  onChange: (unit: FeeKind, value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={id}>{label}</Label>
      <div className="grid grid-cols-2 gap-2">
        <Input id={id} type="number" min="0" max={unit === 'percent' ? 100 : undefined} step="0.01" dir="ltr"
          value={value} onChange={event => onChange(unit, event.target.value)} />
        <select aria-label="وحدة الغرامة" className="h-10 rounded-md border bg-background px-2 text-sm" value={unit}
          onChange={event => onChange(event.target.value as FeeKind, value)}>
          <option value="percent">نسبة %</option>
          <option value="fixed">{currency}</option>
        </select>
      </div>
    </div>
  );
}

export function BookingCancellationTermsFields({ value, onChange, currency }: {
  value?: BookingCancellationTerms; onChange: (terms: BookingCancellationTerms) => void; currency: string;
}) {
  const id = useId();
  const terms = value ?? emptyTerms;
  const setDue = (payment_due: string) => onChange({
    ...terms, payment_due,
    planned_payment: payment_due ? terms.planned_payment : '',
  });
  return (
    <details className="rounded-lg border p-3">
      <summary className="cursor-pointer text-sm font-semibold">سياسة الإلغاء وسداد المورد</summary>
      <div className="mt-4 space-y-4">
        <div className="space-y-1">
          <Label htmlFor={id + '-zone'}>المنطقة الزمنية للمواعيد</Label>
          <select id={id + '-zone'} className="h-10 w-full rounded-md border bg-background px-3 text-sm" dir="ltr" value={terms.timezone}
            onChange={event => onChange({ ...terms, timezone: event.target.value })}>
            {timeZones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
          </select>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <PolicyFields label="شروط المورد" value={terms.supplier} currency={currency} onChange={supplier => onChange({ ...terms, supplier })} />
          <PolicyFields label="شروط العميل" value={terms.customer} currency={currency} onChange={customer => onChange({ ...terms, customer })} />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor={id + '-due'}>آخر موعد للسداد عند المورد</Label>
            <Input id={id + '-due'} type="datetime-local" dir="ltr" value={terms.payment_due}
              onChange={event => setDue(event.target.value)} />
            {terms.supplier.free_until && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setDue(terms.supplier.free_until)}>نفس موعد الإلغاء المجاني</Button>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor={id + '-planned'}>موعد الدفع المخطط</Label>
            <Input id={id + '-planned'} type="date" dir="ltr" disabled={!terms.payment_due}
              value={terms.planned_payment || previousCalendarDay(terms.payment_due)}
              max={terms.payment_due.slice(0, 10)} onChange={event => onChange({ ...terms, planned_payment: event.target.value })} />
            {terms.payment_due && !terms.planned_payment && <p className="text-xs text-muted-foreground">المقترح قبل استحقاق المورد بيوم.</p>}
          </div>
        </div>
      </div>
    </details>
  );
}

export function BookingCancellationTermsSummary({ terms, currency }: { terms: BookingCancellationTerms; currency: string }) {
  const feeText = (fee: { unit: FeeKind; value: string }) => `${fee.value} ${fee.unit === 'percent' ? '%' : currency}`;
  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
      {([['شروط المورد', terms.supplier], ['شروط العميل', terms.customer]] as const).map(([label, policy]) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{policyLabels[policy.kind]}</dd>
          {policy.free_until && <dd dir="ltr" className="text-start">{formatPolicyDeadline(policy.free_until)} · {terms.timezone}</dd>}
          {policy.kind !== 'pending' && <dd>{policy.kind === 'free_until' ? 'الغرامة بعد الموعد' : 'غرامة الإلغاء'} · {feeText(policy)}</dd>}
          {policy.rules.map(rule => <dd key={rule.from}>{formatPolicyDeadline(rule.from)} · {feeText(rule)}</dd>)}
        </div>
      ))}
      <div><dt className="text-muted-foreground">آخر موعد للسداد عند المورد</dt>
        <dd>{terms.payment_due ? <span dir="ltr">{formatPolicyDeadline(terms.payment_due)} · {terms.timezone}</span> : '—'}</dd></div>
      <div><dt className="text-muted-foreground">موعد الدفع المخطط</dt>
        <dd>{terms.planned_payment || previousCalendarDay(terms.payment_due) || '—'}</dd></div>
    </dl>
  );
}
