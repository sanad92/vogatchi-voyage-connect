import {
  Sparkles,
  FileText,
  CheckCircle2,
  ClipboardCheck,
  Receipt,
  Wallet,
  Truck,
  Ticket,
  Plane,
  Flag,
  Star,
  Activity,
} from 'lucide-react';

export interface MilestoneMeta {
  label: string;
  icon: any;
  toneClass: string;
}

const MAP: Record<string, MilestoneMeta> = {
  lead_created: { label: 'تم إنشاء العميل المحتمل', icon: Sparkles, toneClass: 'text-primary' },
  quote_sent: { label: 'تم إرسال عرض السعر', icon: FileText, toneClass: 'text-blue-600' },
  quote_accepted: { label: 'قبول عرض السعر', icon: CheckCircle2, toneClass: 'text-emerald-600' },
  quote_revised: { label: 'تعديل عرض السعر', icon: ClipboardCheck, toneClass: 'text-amber-600' },
  booking_confirmed: { label: 'تأكيد الحجز', icon: CheckCircle2, toneClass: 'text-emerald-600' },
  invoice_issued: { label: 'إصدار فاتورة', icon: Receipt, toneClass: 'text-blue-600' },
  payment_received: { label: 'استلام دفعة', icon: Wallet, toneClass: 'text-emerald-600' },
  supplier_paid: { label: 'سداد المورد', icon: Truck, toneClass: 'text-amber-700' },
  voucher_issued: { label: 'إصدار فاوتشر', icon: Ticket, toneClass: 'text-primary' },
  travel_started: { label: 'بداية الرحلة', icon: Plane, toneClass: 'text-blue-600' },
  travel_completed: { label: 'انتهاء الرحلة', icon: Flag, toneClass: 'text-emerald-600' },
  review_requested: { label: 'طلب تقييم', icon: Star, toneClass: 'text-amber-500' },
  stage_changed: { label: 'تغيير المرحلة', icon: Activity, toneClass: 'text-muted-foreground' },
};

export const getMilestone = (kind: string): MilestoneMeta => {
  const k = (kind || '').toLowerCase();
  if (MAP[k]) return MAP[k];
  // heuristic fallbacks
  if (k.includes('quote')) return MAP.quote_sent;
  if (k.includes('invoice')) return MAP.invoice_issued;
  if (k.includes('payment') || k.includes('receipt')) return MAP.payment_received;
  if (k.includes('supplier')) return MAP.supplier_paid;
  if (k.includes('voucher')) return MAP.voucher_issued;
  if (k.includes('travel')) return MAP.travel_started;
  if (k.includes('stage')) return MAP.stage_changed;
  return { label: kind || 'حدث', icon: Activity, toneClass: 'text-muted-foreground' };
};
