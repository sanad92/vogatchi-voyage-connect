/**
 * Three commercial sales modes are QUOTATIONS. They are not inventory holds,
 * confirmed reservations, official visa/permit issuance or recognized revenue.
 */
export const SALE_MODELS = {
  group_seat: 'أفراد داخل برنامج جماعي',
  fit: 'تجزئة / عمرة خاصة FIT',
  b2b_group: 'مجموعة شركة سياحة B2B',
} as const;
export const FULFILLMENT = {
  organizer: 'منظّم البرنامج',
  distributor: 'موزّع برنامج شركة أخرى',
} as const;
export const SALE_STATES = {
  draft: 'مسودة عرض',
  quoted: 'عرض سعر صادر',
  cancelled: 'ملغى',
} as const;
export const SALE_ITEMS = {
  program_seat: 'مقعد برنامج',
  hotel: 'فندق',
  flight: 'طيران',
  transfer: 'انتقالات',
  visa_service: 'خدمة تأشيرة / إجراء',
  guide: 'مرشد / مشرف',
  other: 'خدمة أخرى',
} as const;
export type SaleModel = keyof typeof SALE_MODELS;
export type FulfillmentRole = keyof typeof FULFILLMENT;
export type SaleItemKind = keyof typeof SALE_ITEMS;

export type SaleDraft = {
  name: string;
  program_type: 'hajj' | 'umrah';
  sale_model: SaleModel;
  fulfillment_role: FulfillmentRole;
  program_id: string | null;
  buyer_customer_id: string | null;
  buyer_agency_id: string | null;
  upstream_supplier_id: string | null;
  party_size: number;
  currency: string;
  departure_date: string | null;
  return_date: string | null;
  notes: string | null;
};
export type SimpleProgram = { id:string; program_type:string; currency:string };
export type QuoteLine = {
  id?: string;
  item_kind: SaleItemKind;
  quantity: number | string;
  unit_sell: number | string;
  room_type?: string | null;
  description?: string;
};
export type QuoteCost = {
  item_id: string;
  unit_cost: number | string;
};
const v = (value: string | number | null | undefined) => Number(value ?? 0);
const m = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function validateSaleDraft(d: SaleDraft, program?: SimpleProgram | null): string[] {
  const errors:string[]=[];
  if (!d.name || d.name.trim().length < 3) errors.push('اسم العرض لا يقل عن ثلاثة أحرف');
  if (!Number.isInteger(d.party_size) || d.party_size<1 || d.party_size>10000)
    errors.push('عدد المسافرين يجب أن يكون بين 1 و10000');
  if (!['EGP','SAR','USD','EUR'].includes(d.currency)) errors.push('اختر عملة صحيحة');
  if (d.departure_date && d.return_date && d.return_date<d.departure_date)
    errors.push('العودة قبل السفر');
  if (d.sale_model === 'group_seat' && (!d.program_id || !d.buyer_customer_id))
    errors.push('بيع مقاعد المجموعة يتطلب برنامجًا وعميلًا');
  if (d.sale_model === 'fit' && (!d.buyer_customer_id || !!d.program_id))
    errors.push('عمرة FIT تحتاج عميلًا بدون برنامج جماعي');
  if (d.sale_model === 'b2b_group' && !d.buyer_agency_id)
    errors.push('بيع B2B يحتاج شركة سياحة مشترية');
  if (d.sale_model === 'b2b_group' && d.buyer_customer_id)
    errors.push('عميل B2B يُحدد من شركات السياحة وليس الأفراد');
  if (d.sale_model !== 'b2b_group' && d.buyer_agency_id)
    errors.push('شركة السياحة المشترية متاحة لـB2B فقط');
  if (d.fulfillment_role === 'distributor' && !d.upstream_supplier_id)
    errors.push('الموزّع يجب أن يحدد الشركة المورّدة للبرنامج');
  if (d.fulfillment_role === 'organizer' && d.upstream_supplier_id)
    errors.push('المنظّم لا يحدد مورّدًا رئيسيًا؛ الموردون الفرعيون على بنود التكلفة');
  if (d.program_id && (!program || program.id!==d.program_id ||
      program.program_type!==d.program_type || program.currency!==d.currency))
    errors.push('عملة أو نوع البرنامج لا يطابق عرض السعر');
  return errors;
}

export function quoteReadiness(sale: SaleDraft, lines: QuoteLine[]): string[] {
  const issues: string[]=[];
  if (!lines.length || !lines.some(x=>v(x.unit_sell)>0)) issues.push('أضف خدمة بسعر بيع موجب');
  for (const l of lines) {
    if (!Number.isFinite(v(l.quantity)) || v(l.quantity)<=0 ||
        !Number.isFinite(v(l.unit_sell)) || v(l.unit_sell)<0)
      issues.push('توجد خدمة بكمية أو سعر غير صالح');
  }
  if (sale.program_id && ['group_seat','b2b_group'].includes(sale.sale_model)) {
    const seatQuantity=lines.filter(l=>l.item_kind==='program_seat')
      .reduce((sum,l)=>sum+v(l.quantity),0);
    if (seatQuantity!==sale.party_size) issues.push('عدد مقاعد البرنامج لا يساوي عدد المسافرين');
  }
  return issues;
}

export function quoteMetrics(lines: QuoteLine[], costs: QuoteCost[]) {
  const costMap=new Map(costs.map(c=>[c.item_id, v(c.unit_cost)]));
  const selling=m(lines.reduce((sum,l)=>sum+m(v(l.quantity)*v(l.unit_sell)),0));
  const missing=lines.filter(l=>!l.id || !costMap.has(l.id)).length;
  const estimatedCost=m(lines.reduce((sum,l)=>
    sum+(l.id && costMap.has(l.id) ? m(v(l.quantity)*costMap.get(l.id)!) : 0),0));
  return {
    selling,
    estimatedCost: missing === 0 ? estimatedCost : null,
    estimatedMargin: missing === 0 ? m(selling-estimatedCost) : null,
    missingCostLines: missing,
  };
}
