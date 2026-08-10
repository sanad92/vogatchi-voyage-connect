/**
 * Shared vocabulary + safe calculations for the SOP pricing offers.
 * All maths must be null/zero safe — never surface NaN or Infinity to users.
 */

export interface PricingOptionLike {
  currency?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  net_cost?: number | null;
  selling_price?: number | null;
  ota_price?: number | null;
  hotel_direct_price?: number | null;
  price_valid_until?: string | null;
}

export const ROOM_TYPES = [
  'Single', 'Double', 'Twin', 'Triple', 'Quad',
  'Studio', 'Suite', 'Junior Suite', 'Family Room', 'Connecting Rooms',
];

export const ROOM_VIEWS = [
  'City View', 'Sea View', 'Pool View', 'Garden View', 'Nile View',
  'Mountain View', 'Land View', 'Panoramic View',
];

export const MEAL_PLANS: { value: string; label: string }[] = [
  { value: 'RO', label: 'RO — بدون وجبات' },
  { value: 'BB', label: 'BB — إفطار' },
  { value: 'HB', label: 'HB — نصف إقامة' },
  { value: 'FB', label: 'FB — إقامة كاملة' },
  { value: 'AI', label: 'AI — شامل كلياً' },
  { value: 'UAI', label: 'UAI — شامل فاخر' },
];

export const OTA_SOURCES: { value: string; label: string }[] = [
  { value: 'booking.com', label: 'Booking.com' },
  { value: 'expedia', label: 'Expedia' },
  { value: 'agoda', label: 'Agoda' },
  { value: 'other', label: 'مصدر آخر' },
];

export const CANCELLATION_TYPES: { value: string; label: string }[] = [
  { value: 'free', label: 'إلغاء مجاني' },
  { value: 'non_refundable', label: 'غير قابل للاسترداد' },
  { value: 'partial', label: 'استرداد جزئي' },
  { value: 'custom', label: 'سياسة مخصصة' },
];

export const CANCELLATION_CHARGE_MODELS: { value: string; label: string }[] = [
  { value: 'fixed', label: 'مبلغ ثابت' },
  { value: 'percent', label: 'نسبة مئوية' },
  { value: 'first_night', label: 'ليلة أولى' },
  { value: 'full_stay', label: 'كامل الإقامة' },
  { value: 'custom', label: 'أخرى' },
];

export const TRANSFER_STATUSES: { value: string; label: string }[] = [
  { value: 'not_included', label: 'غير شامل الانتقالات' },
  { value: 'included', label: 'شامل الانتقالات' },
  { value: 'optional', label: 'انتقالات كإضافة اختيارية' },
];

export const RECOMMENDATION_REASONS: { value: string; label: string }[] = [
  { value: 'best_price', label: 'أفضل سعر' },
  { value: 'best_value', label: 'أفضل قيمة مقابل السعر' },
  { value: 'better_location', label: 'موقع أفضل' },
  { value: 'better_room', label: 'غرفة أفضل' },
  { value: 'better_cancellation', label: 'سياسة إلغاء أفضل' },
  { value: 'better_meal_plan', label: 'نظام وجبات أفضل' },
  { value: 'best_overall', label: 'الأفضل إجمالاً' },
  { value: 'other', label: 'سبب آخر' },
];

const labelOf = (list: { value: string; label: string }[], value?: string | null) =>
  (value ? list.find((i) => i.value === value)?.label ?? value : '');

export const mealPlanLabel = (v?: string | null) => labelOf(MEAL_PLANS, v);
export const otaSourceLabel = (v?: string | null) => labelOf(OTA_SOURCES, v);
export const cancellationTypeLabel = (v?: string | null) => labelOf(CANCELLATION_TYPES, v);
export const cancellationChargeLabel = (v?: string | null) => labelOf(CANCELLATION_CHARGE_MODELS, v);
export const transferStatusLabel = (v?: string | null) => labelOf(TRANSFER_STATUSES, v);
export const recommendationReasonLabel = (v?: string | null) => labelOf(RECOMMENDATION_REASONS, v);

export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const nightsBetween = (checkIn?: string | null, checkOut?: string | null): number => {
  if (!checkIn || !checkOut) return 0;
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.ceil((b - a) / 86400000);
};

/** Division that returns null instead of NaN/Infinity. */
const safeDiv = (a: number, b: number): number | null =>
  b > 0 && Number.isFinite(a / b) ? Math.round((a / b) * 100) / 100 : null;

export interface PricingMetrics {
  nights: number;
  currency: string;
  vogatchiTotal: number;
  vogatchiPerNight: number | null;
  otaTotal: number;
  otaPerNight: number | null;
  hotelDirectTotal: number;
  hotelDirectPerNight: number | null;
  savingVsOta: number | null;
  savingVsOtaPct: number | null;
  savingVsDirect: number | null;
  savingVsDirectPct: number | null;
  grossProfit: number;
  marginPct: number | null;
  markupPct: number | null;
  isExpired: boolean;
}

export const computePricingMetrics = (
  o: PricingOptionLike,
  fallback?: { check_in?: string | null; check_out?: string | null },
): PricingMetrics => {
  const nights = nightsBetween(
    o.check_in || fallback?.check_in,
    o.check_out || fallback?.check_out,
  );
  const vogatchiTotal = num(o.selling_price);
  const otaTotal = num(o.ota_price);
  const hotelDirectTotal = num(o.hotel_direct_price);
  const netCost = num(o.net_cost);
  const grossProfit = vogatchiTotal - netCost;

  return {
    nights,
    currency: o.currency || 'EGP',
    vogatchiTotal,
    vogatchiPerNight: safeDiv(vogatchiTotal, nights),
    otaTotal,
    otaPerNight: safeDiv(otaTotal, nights),
    hotelDirectTotal,
    hotelDirectPerNight: safeDiv(hotelDirectTotal, nights),
    savingVsOta: otaTotal > 0 ? Math.round((otaTotal - vogatchiTotal) * 100) / 100 : null,
    savingVsOtaPct: otaTotal > 0 ? safeDiv((otaTotal - vogatchiTotal) * 100, otaTotal) : null,
    savingVsDirect: hotelDirectTotal > 0 ? Math.round((hotelDirectTotal - vogatchiTotal) * 100) / 100 : null,
    savingVsDirectPct: hotelDirectTotal > 0 ? safeDiv((hotelDirectTotal - vogatchiTotal) * 100, hotelDirectTotal) : null,
    grossProfit: Math.round(grossProfit * 100) / 100,
    marginPct: vogatchiTotal > 0 ? safeDiv(grossProfit * 100, vogatchiTotal) : null,
    markupPct: netCost > 0 ? safeDiv(grossProfit * 100, netCost) : null,
    isExpired: !!o.price_valid_until && new Date(o.price_valid_until).getTime() < Date.now(),
  };
};

export const money = (v: number | null | undefined, currency?: string | null) =>
  v === null || v === undefined || !Number.isFinite(Number(v))
    ? '—'
    : `${Number(v).toLocaleString('en-US')} ${currency || ''}`.trim();

export const pct = (v: number | null | undefined) =>
  v === null || v === undefined || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(1)}%`;

export const dateTimeLabel = (v?: string | null) =>
  v ? new Date(v).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const dateLabel = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('ar-EG') : '—';

/** Convert an ISO timestamp to the value a datetime-local input expects. */
export const toLocalInput = (v?: string | null) => {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

/** Org feature flag that lets Sales see internal cost/margin data. Default false. */
export const SALES_VIEW_COSTS_FLAG = 'sales_view_pricing_costs';
