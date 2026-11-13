/**
 * Pure Safar ERP pilgrimage calculations. These are operational warnings only:
 * statutory travel, vaccination, visa and passport conditions must be confirmed
 * against each destination/season/operator's official requirements.
 */
export type PilgrimRecord = {
  id?: string;
  status?: string | null;
  total_price?: number | string | null;
  paid_amount?: number | string | null;
  reserved_refunds?: number | string | null;
  cancellation_fee?: number | string | null;
  full_name?: string | null;
  name_en?: string | null;
  passport_number?: string | null;
  passport_expiry?: string | null;
  national_id?: string | null;
  documents_complete?: boolean | null;
  vaccination_done?: boolean | null;
  visa_status?: string | null;
  makkah_room?: string | null;
  madinah_room?: string | null;
  makkah_rooming_group_id?: string | null;
  madinah_rooming_group_id?: string | null;
  bus_number?: string | null;
  room_type?: string | null;
};
export type ProgramRecord = {
  status?: string | null;
  travel_scope?: 'domestic' | 'international' | string | null;
  capacity?: number | null;
  departure_date?: string | null;
  return_date?: string | null;
  makkah_nights?: number | null;
  madinah_nights?: number | null;
  price_quad?: number | null;
  price_triple?: number | null;
  price_double?: number | null;
  price_single?: number | null;
};
export const amount = (value: unknown): number => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};
export const isActivePilgrim = (p: PilgrimRecord) => p.status !== 'cancelled';
export const pilgrimDue = (p: PilgrimRecord) => Math.max(
  0, amount(isActivePilgrim(p) ? p.total_price : p.cancellation_fee)
);
export const pilgrimNetPaid = (p: PilgrimRecord) =>
  Math.max(0, Math.round(amount(p.paid_amount) * 100) - Math.round(amount(p.reserved_refunds) * 100)) / 100;
export const outstanding = (p: PilgrimRecord) =>
  Math.max(0, pilgrimDue(p) - pilgrimNetPaid(p));
export const refundable = (p: PilgrimRecord) =>
  Math.max(0, pilgrimNetPaid(p) - pilgrimDue(p));

export function pilgrimageTotals(pilgrims: PilgrimRecord[]) {
  const active = pilgrims.filter(isActivePilgrim);
  return {
    registered: active.length,
    grossDue: pilgrims.reduce((s,p) => s + pilgrimDue(p),0),
    collected: pilgrims.reduce((s,p) => s + Math.max(0,amount(p.paid_amount)),0),
    outstanding: pilgrims.reduce((s,p) => s + outstanding(p),0),
    refundExposure: pilgrims.reduce((s,p) => s + refundable(p),0),
  };
}

export function validatePilgrimageProgram(p: ProgramRecord, name: string) {
  const errors: string[] = [];
  if (name.trim().length < 3) errors.push('اسم البرنامج يجب ألا يقل عن 3 حروف');
  if (p.departure_date && p.return_date && p.return_date < p.departure_date)
    errors.push('تاريخ العودة يسبق تاريخ السفر');
  if (!Number.isInteger(amount(p.capacity)) || amount(p.capacity) < 0)
    errors.push('السعة يجب أن تكون عددًا صحيحًا غير سالب؛ صفر يعني سعة غير محددة');
  for (const key of ['makkah_nights','madinah_nights'] as const) {
    if (!Number.isInteger(amount(p[key])) || amount(p[key]) < 0)
      errors.push('عدد ليالي الإقامة غير صحيح');
  }
  for (const key of ['price_quad','price_triple','price_double','price_single'] as const) {
    const value=amount(p[key]);
    if (value < 0 || !Number.isFinite(Number(p[key] ?? 0)))
      errors.push('أسعار بيع الغرف يجب أن تكون أرقامًا غير سالبة');
  }
  return errors;
}

export function canRegisterPilgrim(p: ProgramRecord, current: PilgrimRecord[]) {
  if (p.status !== 'open') return 'التسجيل متاح فقط عندما تكون حالة البرنامج «التسجيل مفتوح»';
  const slots = amount(p.capacity);
  if (slots > 0 && current.filter(isActivePilgrim).length >= slots)
    return 'البرنامج مكتمل العدد';
  return null;
}

export function readinessIssues(p: PilgrimRecord, program: ProgramRecord) {
  const issues: string[] = [];
  if (!p.full_name?.trim()) issues.push('الاسم غير مسجل');
  if (program.travel_scope === 'domestic') {
    if (!p.national_id?.trim()) issues.push('رقم الهوية / الإقامة ناقص');
  } else {
    if (!p.name_en?.trim()) issues.push('الاسم بالإنجليزية ناقص');
    if (!p.passport_number?.trim()) issues.push('رقم الجواز ناقص');
    if (!p.passport_expiry) issues.push('تاريخ انتهاء الجواز ناقص');
    if (p.passport_expiry && program.return_date && p.passport_expiry < program.return_date)
      issues.push('الجواز ينتهي قبل العودة');
    if (!['issued','not_required'].includes(p.visa_status || ''))
      issues.push('حالة التأشيرة لم تُعتمد بعد');
  }
  if (!p.documents_complete) issues.push('المستندات لم تُعلّم مكتملة');
  if (amount(program.makkah_nights) > 0 && !p.makkah_rooming_group_id && !p.makkah_room?.trim())
    issues.push('غرفة مكة غير محددة');
  if (amount(program.madinah_nights) > 0 && !p.madinah_rooming_group_id && !p.madinah_room?.trim())
    issues.push('غرفة المدينة غير محددة');
  return issues;
}
