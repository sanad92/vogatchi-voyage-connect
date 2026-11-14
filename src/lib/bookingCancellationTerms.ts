export type PolicyKind = 'pending' | 'free_until' | 'penalty' | 'non_refundable';
export type FeeKind = 'fixed' | 'percent';
export type CancellationRule = { from: string; unit: FeeKind; value: string };
export type CancellationPolicy = {
  kind: PolicyKind;
  free_until: string;
  unit: FeeKind;
  value: string;
  rules: CancellationRule[];
};
export type BookingCancellationTerms = {
  timezone: string;
  supplier: CancellationPolicy;
  customer: CancellationPolicy;
  payment_due: string;
  planned_payment: string;
};

export const policyLabels: Record<PolicyKind, string> = {
  pending: 'بانتظار التأكيد',
  free_until: 'إلغاء مجاني حتى موعد محدد',
  penalty: 'إلغاء بغرامة',
  non_refundable: 'غير قابل للاسترداد',
};

export const emptyPolicy: CancellationPolicy = {
  kind: 'pending', free_until: '', unit: 'percent', value: '', rules: [],
};
export const emptyTerms: BookingCancellationTerms = {
  timezone: 'Africa/Cairo', supplier: emptyPolicy, customer: emptyPolicy, payment_due: '', planned_payment: '',
};

export function previousCalendarDay(dateTime: string): string {
  const date = dateTime.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return '';
  const day = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(day.getTime())) return '';
  day.setUTCDate(day.getUTCDate() - 1);
  return day.toISOString().slice(0, 10);
}

export function readTerms(value: unknown): BookingCancellationTerms | undefined {
  if (!value || typeof value !== 'object' || !('supplier' in value) || !('customer' in value)) return undefined;
  return value as BookingCancellationTerms;
}

export function termsError(terms?: BookingCancellationTerms, supplierCost?: number, customerPrice?: number): string | undefined {
  if (!terms) return;
  if (terms.planned_payment && (!terms.payment_due || terms.planned_payment > terms.payment_due.slice(0, 10))) {
    return 'موعد الدفع المخطط لازم يكون في يوم الاستحقاق أو قبله.';
  }
  for (const [policy, basis] of [[terms.supplier, supplierCost], [terms.customer, customerPrice]] as const) {
    if (policy.kind === 'pending') continue;
    if (policy.kind === 'free_until' && !policy.free_until) return 'حدّد آخر موعد للإلغاء المجاني.';
    const values = [policy, ...policy.rules];
    if (values.some(fee => !/^\d+(\.\d{1,2})?$/.test(fee.value) || (fee.unit === 'percent' && Number(fee.value) > 100))) {
      return 'أدخل غرامة صالحة أو نسبة من ٠ إلى ١٠٠.';
    }
    if (basis != null && values.some(fee => fee.unit === 'fixed' && Number(fee.value) > basis)) {
      return 'الغرامة تتجاوز قيمة الخدمة.';
    }
    let previous = policy.kind === 'free_until' ? policy.free_until : '';
    for (const rule of policy.rules) {
      if (!rule.from || rule.from <= previous) return 'رتّب مواعيد مراحل الغرامة من الأقدم للأحدث.';
      previous = rule.from;
    }
  }
}

export type BookingTermsSnapshot = { label: string; terms: BookingCancellationTerms | null; currency: string };

export function formatPolicyDeadline(value: string): string {
  return value ? value.replace('T', ' ') : '—';
}
