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

/* ------------------------------------------------------------------ publish readiness */

export interface PublishBlocker {
  code: string;
  message: string;
}

export interface PublishReadyOption {
  id: string;
  option_index?: number | null;
  hotel_name?: string | null;
  room_type?: string | null;
  meal_plan?: string | null;
  net_cost?: number | null;
  selling_price?: number | null;
  cancellation_type?: string | null;
  cancellation_policy?: string | null;
  price_valid_until?: string | null;
  is_recommended?: boolean | null;
}

const positive = (v: unknown) => Number.isFinite(Number(v)) && Number(v) > 0;
const filled = (v: unknown) => typeof v === 'string' ? v.trim().length > 0 : v !== null && v !== undefined;

/**
 * Effective validity for one offer: its own override when present, otherwise
 * the request-level (global) validity date. Never a parallel model.
 */
export const effectiveValidUntil = (
  o: { price_valid_until?: string | null },
  requestValidUntil?: string | null,
): string | null => {
  if (o?.price_valid_until) return o.price_valid_until;
  if (requestValidUntil && String(requestValidUntil).trim()) {
    return `${String(requestValidUntil).slice(0, 10)}T23:59:59`;
  }
  return null;
};

/**
 * Single source of truth for "can this pricing request be published?".
 * Mirrors exactly what `sop_publish_pricing` validates — never stricter.
 * Optional data (OTA/hotel-direct benchmarks, transfers, room view, notes) is
 * deliberately NOT required.
 */
export const publishBlockers = (
  options: PublishReadyOption[],
  requestValidUntil?: string | null,
  opts: { unsavedOfferIndexes?: number[] } = {},
): PublishBlocker[] => {
  const out: PublishBlocker[] = [];
  const label = (o: PublishReadyOption) => `العرض ${o.option_index ?? '؟'}`;

  if (!options.length) {
    out.push({ code: 'no_options', message: 'أضف عرضاً واحداً على الأقل.' });
  }
  if (options.length > 3) {
    out.push({ code: 'more_than_three_options', message: 'الحد الأقصى 3 عروض — احذف عرضاً زائداً.' });
  }
  if (opts.unsavedOfferIndexes?.length) {
    out.push({
      code: 'unsaved',
      message: `تعديلات غير محفوظة في ${opts.unsavedOfferIndexes.map((i) => `العرض ${i}`).join(' و')} — اضغط «حفظ العرض».`,
    });
  }

  for (const o of options) {
    if (!filled(o.hotel_name)) out.push({ code: 'hotel_name', message: `${label(o)}: اسم الفندق مطلوب.` });
    if (!filled(o.room_type)) out.push({ code: 'room_type', message: `${label(o)}: نوع الغرفة مطلوب.` });
    if (!filled(o.meal_plan)) out.push({ code: 'meal_plan', message: `${label(o)}: نظام الوجبات مطلوب.` });
    if (!positive(o.net_cost)) out.push({ code: 'net_cost', message: `${label(o)}: صافي التكلفة مطلوب (أكبر من صفر).` });
    if (!positive(o.selling_price)) out.push({ code: 'selling_price', message: `${label(o)}: سعر البيع مطلوب (أكبر من صفر).` });
    if (!filled(o.cancellation_type) && !filled(o.cancellation_policy)) {
      out.push({ code: 'cancellation', message: `${label(o)}: سياسة الإلغاء مطلوبة.` });
    }
    // Per-offer expiry is only a blocker for the recommended offer, exactly like the RPC.
    const eff = effectiveValidUntil(o, requestValidUntil);
    if (o.is_recommended && eff && new Date(eff).getTime() < Date.now()) {
      out.push({ code: 'option_price_expired', message: `${label(o)}: السعر الموصى به انتهت صلاحيته — حدّثه.` });
    }
  }

  const recommended = options.filter((o) => !!o.is_recommended);
  if (options.length && recommended.length === 0) {
    out.push({ code: 'no_recommended_option', message: 'فعّل مفتاح «موصى به» على عرض واحد.' });
  }
  if (recommended.length > 1) {
    out.push({ code: 'multiple_recommended', message: 'يجب أن يكون هناك عرض موصى به واحد فقط.' });
  }

  // Validity: the request-level date is the default for every offer. An offer
  // only needs its own date when it explicitly overrides the global one.
  const missingValidity = options.filter((o) => !effectiveValidUntil(o, requestValidUntil));
  if (missingValidity.length) {
    out.push({
      code: 'price_validity_required',
      message: 'حدد تاريخ «صلاحية التسعير حتى» (يسري على كل العروض).',
    });
  }
  if (!options.length && !filled(requestValidUntil)) {
    out.push({ code: 'price_validity_required', message: 'حدد تاريخ «صلاحية التسعير حتى».' });
  }
  if (filled(requestValidUntil) && new Date(`${requestValidUntil}T23:59:59`).getTime() < Date.now()) {
    out.push({ code: 'price_validity_expired', message: 'تاريخ صلاحية التسعير في الماضي — اختر تاريخاً لاحقاً.' });
  }

  // De-duplicate identical messages.
  return out.filter((b, i) => out.findIndex((x) => x.message === b.message) === i);
};

/** Latest per-offer validity date, used to prefill the request-level date. */
export const suggestedValidUntil = (options: PublishReadyOption[]): string => {
  const dates = options.map((o) => o.price_valid_until).filter(Boolean) as string[];
  if (!dates.length) return '';
  const max = dates.map((d) => new Date(d).getTime()).filter(Number.isFinite).sort((a, b) => b - a)[0];
  return max ? new Date(max).toISOString().slice(0, 10) : '';
};
