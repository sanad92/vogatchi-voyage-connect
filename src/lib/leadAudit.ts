// Lead stage audit — shared vocabulary and duration formatting.
// Field names stay English; user-facing labels are Arabic.

export type LeadAuditAction =
  | 'lead_created'
  | 'cs_first_response'
  | 'intake_completed'
  | 'sales_claimed'
  | 'sales_assigned'
  | 'assignment_acknowledged'
  | 'reassigned'
  | 'pricing_requested'
  | 'pricing_claimed'
  | 'pricing_published'
  | 'pricing_returned'
  | 'customer_accepted'
  | 'recheck_requested'
  | 'recheck_completed'
  | 'booking_confirmed'
  | 'lead_lost'
  | 'disqualified'
  | 'reopened'
  | 'moved_back'
  | 'handover_updated'
  | 'stage_changed';

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  lead_created: 'العميل دخل النظام',
  cs_first_response: 'خدمة العملاء بدأت التعامل',
  intake_completed: 'اكتملت بيانات الاستقبال',
  sales_claimed: 'المبيعات استلم العميل',
  sales_assigned: 'تم إسناد العميل للمبيعات',
  assignment_acknowledged: 'المندوب أكد الاستلام',
  reassigned: 'إعادة إسناد',
  pricing_requested: 'تم طلب التسعير',
  pricing_claimed: 'الحجوزات استلمت طلب التسعير',
  pricing_published: 'تم الانتهاء من التسعير',
  pricing_returned: 'رجع التسعير للمبيعات',
  customer_accepted: 'العميل وافق',
  recheck_requested: 'طلب إعادة التحقق',
  recheck_completed: 'تمت إعادة التحقق',
  booking_confirmed: 'تم تأكيد الحجز',
  lead_lost: 'العميل مفقود',
  disqualified: 'غير مؤهل',
  reopened: 'إعادة فتح الملف',
  moved_back: 'رجوع للخلف',
  handover_updated: 'تحديث التسليم',
  stage_changed: 'تغيير المرحلة',
};

/** Tailwind tone per action group (semantic tokens only). */
export const AUDIT_ACTION_TONE: Record<string, string> = {
  lead_created: 'text-primary',
  cs_first_response: 'text-primary',
  intake_completed: 'text-primary',
  sales_claimed: 'text-blue-600',
  sales_assigned: 'text-blue-600',
  assignment_acknowledged: 'text-blue-600',
  pricing_requested: 'text-amber-600',
  pricing_claimed: 'text-amber-600',
  pricing_published: 'text-emerald-600',
  pricing_returned: 'text-emerald-600',
  customer_accepted: 'text-emerald-600',
  recheck_requested: 'text-amber-600',
  recheck_completed: 'text-emerald-600',
  booking_confirmed: 'text-emerald-700',
  lead_lost: 'text-destructive',
  disqualified: 'text-destructive',
};

/** Milestones management asks about, in canonical order. */
export const KEY_MILESTONES: string[] = [
  'lead_created',
  'cs_first_response',
  'intake_completed',
  'sales_claimed',
  'pricing_requested',
  'pricing_claimed',
  'pricing_published',
  'customer_accepted',
  'recheck_completed',
  'booking_confirmed',
];

export const KPI_LABELS: Record<string, string> = {
  first_response: 'أول رد من خدمة العملاء',
  intake: 'زمن اكتمال بيانات الاستقبال',
  wait_sales_claim: 'انتظار استلام المبيعات',
  sales_handling: 'تعامل المبيعات قبل طلب التسعير',
  reservations_queue: 'انتظار في طابور الحجوزات',
  pricing_turnaround: 'زمن إنجاز التسعير',
  customer_decision: 'زمن قرار العميل',
  recheck: 'زمن إعادة التحقق',
  lead_to_booking: 'من دخول العميل حتى تأكيد الحجز',
};

/** Canonical numeric duration is minutes; this renders it for humans. */
export function formatDuration(minutes?: number | null): string {
  if (minutes === null || minutes === undefined || Number.isNaN(Number(minutes))) return '—';
  const total = Math.max(0, Math.round(Number(minutes)));
  if (total < 1) return 'أقل من دقيقة';
  if (total < 60) return `${total} د`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours < 24) return mins ? `${hours} س ${mins} د` : `${hours} س`;
  const days = Math.floor(hours / 24);
  const restHours = hours % 24;
  return restHours ? `${days} ي ${restHours} س` : `${days} ي`;
}

export function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ar-EG', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export const actionLabel = (action: string) => AUDIT_ACTION_LABELS[action] || action;
