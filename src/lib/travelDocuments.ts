/**
 * Customer-facing travel document models (Invoice + Voucher).
 *
 * SAFETY CONTRACT
 * ---------------
 * The voucher model intentionally has NO monetary fields at the type level.
 * Every value is explicitly whitelisted — never spread a booking/invoice row
 * into these models, otherwise cost/profit/markup can leak into a customer
 * document. `scrubMoney()` is a second line of defence applied to voucher
 * facts before rendering.
 */

export interface DocBrand {
  name: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  taxNumber?: string;
  commercialRegistration?: string;
  footerText?: string;
}

export interface DocFact {
  label: string;
  value: string;
}

export type DocSectionKind = 'hotel' | 'flight' | 'transport' | 'car' | 'service';

export interface DocSection {
  kind: DocSectionKind;
  title: string;
  subtitle?: string;
  facts: DocFact[];
  notes?: string[];
}

export interface DocParty {
  name: string;
  phone?: string;
  email?: string;
  nationality?: string;
}

export interface DocLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceDocModel {
  documentNumber: string;
  bookingReference?: string;
  issuedDate?: string;
  dueDate?: string;
  paymentStatus: { key: string; labelAr: string; labelEn: string };
  brand: DocBrand;
  customer: DocParty;
  sections: DocSection[];
  lineItems: DocLineItem[];
  totals: {
    currency: string;
    subtotal: number;
    discount: number;
    vat: number;
    vatRate: number;
    total: number;
    paid: number;
    balance: number;
  };
  customerNotes: string[];
  terms?: string;
}

export interface VoucherDocModel {
  voucherNumber: string;
  bookingReference?: string;
  issuedDate?: string;
  brand: DocBrand;
  traveler: DocParty;
  destination?: string;
  travelStart?: string;
  travelEnd?: string;
  sections: DocSection[];
  specialRequests: string[];
  customerNotes: string[];
  terms?: string;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

export const fmtDate = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const fmtMoney = (amount: number, currency: string): string =>
  `${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;

/** Raw identifiers must never surface on a customer-facing document. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fact = (label: string, value: unknown): DocFact | null => {
  if (value === null || value === undefined) return null;
  const v = String(value).trim();
  if (!v || v === '0' || v.toLowerCase() === 'null') return null;
  if (UUID_RE.test(v)) return null;
  return { label, value: v };
};


const facts = (...rows: (DocFact | null)[]): DocFact[] => rows.filter(Boolean) as DocFact[];

/** Money-shaped label/value detector used to keep vouchers financially clean. */
const MONEY_LABEL = /(price|cost|amount|total|profit|margin|markup|net|rate|fee|tax|vat|paid|balance|due|سعر|تكلفة|مبلغ|إجمالي|ربح|هامش|صافي|عمولة|ضريبة|مدفوع|متبقي|رسوم)/i;
const MONEY_VALUE = /(^|\s)(?:[\p{Sc}]|EGP|USD|SAR|AED|EUR|GBP|ج\.م|ر\.س|د\.إ)\s*[\d.,]/iu;

export const scrubMoney = (list: DocFact[]): DocFact[] =>
  list.filter((f) => !MONEY_LABEL.test(f.label) && !MONEY_VALUE.test(f.value));

const scrubSections = (sections: DocSection[]): DocSection[] =>
  sections.map((s) => ({ ...s, facts: scrubMoney(s.facts) }));

const MEAL_PLANS: Record<string, string> = {
  RO: 'غرفة فقط (Room Only)',
  BB: 'إفطار (Bed & Breakfast)',
  HB: 'نصف إقامة (Half Board)',
  FB: 'إقامة كاملة (Full Board)',
  ALL: 'شامل كليًا (All Inclusive)',
  UAI: 'شامل فاخر (Ultra All Inclusive)',
  SAL: 'شامل جزئيًا (Soft All Inclusive)',
};

const mealLabel = (code?: string | null) =>
  code ? MEAL_PLANS[String(code).toUpperCase()] || code : undefined;

const PAYMENT_STATUS: Record<string, { labelAr: string; labelEn: string }> = {
  paid: { labelAr: 'مدفوعة بالكامل', labelEn: 'Paid' },
  partial: { labelAr: 'مدفوعة جزئيًا', labelEn: 'Partially Paid' },
  unpaid: { labelAr: 'غير مدفوعة', labelEn: 'Unpaid' },
  overdue: { labelAr: 'متأخرة السداد', labelEn: 'Overdue' },
  cancelled: { labelAr: 'ملغاة', labelEn: 'Cancelled' },
};

export interface DocSourceData {
  booking: any;
  customer?: any;
  itinerary?: {
    hotel?: any;
    flight?: any;
    transport?: any;
    car?: any;
  } | null;
  org?: any;
  /** rows of booking_special_requests joined with special_request_types */
  specialRequests?: any[];
  /** customer-facing template copy (document_templates) */
  template?: { notes_text?: string | null; terms_text?: string | null } | null;
}

export const buildBrand = (org: any): DocBrand => ({
  name: org?.name || 'Vogatchi Trips',
  logoUrl: org?.logo_url || undefined,
  phone: org?.phone || undefined,
  email: org?.email || undefined,
  website: org?.website || undefined,
  address: org?.address || undefined,
  taxNumber: org?.tax_number || undefined,
  commercialRegistration: org?.commercial_registration || undefined,
  footerText: org?.footer_text || undefined,
});

/** Build the travel/service sections shared by both documents. */
export const buildSections = (src: DocSourceData): DocSection[] => {
  const { booking, itinerary } = src;
  const sections: DocSection[] = [];
  const h = itinerary?.hotel;
  const f = itinerary?.flight;
  const t = itinerary?.transport;
  const c = itinerary?.car;

  if (h) {
    const pax = [
      h.adults ? `${h.adults} بالغ` : null,
      h.children ? `${h.children} طفل` : null,
    ]
      .filter(Boolean)
      .join(' + ');
    sections.push({
      kind: 'hotel',
      title: h.hotel_name || 'الإقامة الفندقية',
      subtitle: [h.city, h.star_rating ? `${h.star_rating}★` : null].filter(Boolean).join(' · '),
      facts: facts(
        fact('المدينة / الوجهة', h.city),
        fact('تاريخ الوصول', fmtDate(h.check_in)),
        fact('تاريخ المغادرة', fmtDate(h.check_out)),
        fact('عدد الليالي', h.nights),
        fact('عدد الغرف', h.rooms),
        fact('نوع الغرفة', h.room_type),
        fact('الإطلالة', h.room_view),
        fact('نظام الوجبات', mealLabel(h.meal_plan || h.board_type)),
        fact('عدد النزلاء', pax),
        fact('أعمار الأطفال', h.children_ages),
        fact('رقم تأكيد الحجز', h.booking_reference),
      ),
      notes: h.cancellation_policy ? [String(h.cancellation_policy)] : undefined,
    });
  }

  if (f) {
    sections.push({
      kind: 'flight',
      title: f.airline ? `رحلة طيران — ${f.airline}` : 'رحلة الطيران',
      subtitle: [f.departure_airport, f.arrival_airport].filter(Boolean).join(' → ') || undefined,
      facts: facts(
        fact('رقم الرحلة', f.flight_number),
        fact('المغادرة', [fmtDate(f.departure_date), f.departure_time].filter(Boolean).join(' ')),
        fact('الوصول', [fmtDate(f.arrival_date), f.arrival_time].filter(Boolean).join(' ')),
        fact('درجة السفر', f.flight_class),
        fact('عدد المسافرين', f.passengers_count),
        fact('نوع الرحلة', f.is_round_trip ? 'ذهاب وعودة' : undefined),
        fact('رمز الحجز (PNR)', f.pnr),
        fact('رقم التذكرة', f.ticket_number),
        fact('تفضيلات المقاعد', f.seat_preferences),
        fact('تفضيلات الوجبات', f.meal_preferences),
      ),
    });
  }

  if (t) {
    sections.push({
      kind: 'transport',
      title: 'خدمة الانتقالات',
      subtitle: t.route || undefined,
      facts: facts(
        fact('نوع المركبة', t.vehicle_type),
        fact('المسار', t.route),
        fact('نقطة الاستلام', t.pickup_point),
        fact('نقطة التوصيل', t.dropoff_point),
        fact('عدد الركاب', t.passengers),
      ),
    });
  }

  if (c) {
    sections.push({
      kind: 'car',
      title: 'تأجير سيارة',
      subtitle: c.car_type || undefined,
      facts: facts(
        fact('فئة السيارة', c.car_type),
        fact('مكان الاستلام', c.pickup_location),
        fact('تاريخ الاستلام', fmtDate(c.pickup_date)),
        fact('مكان التسليم', c.dropoff_location),
        fact('تاريخ التسليم', fmtDate(c.dropoff_date)),
        fact('التأمين', c.insurance_included ? 'مشمول' : undefined),
      ),
    });
  }

  if (!sections.length) {
    sections.push({
      kind: 'service',
      title: booking?.booking_type ? `خدمة: ${booking.booking_type}` : 'تفاصيل الخدمة',
      subtitle: booking?.destination || undefined,
      facts: facts(
        fact('الوجهة', booking?.destination),
        fact('تاريخ البداية', fmtDate(booking?.start_date)),
        fact('تاريخ النهاية', fmtDate(booking?.end_date)),
      ),
    });
  }

  return sections;
};

const specialRequestLines = (rows?: any[]): string[] =>
  (rows ?? [])
    .map((r) =>
      [r?.special_request_type?.name, r?.custom_request_text].filter(Boolean).join(' — '),
    )
    .filter((s: string) => s.trim().length > 0);

/* ------------------------------------------------------------------ */
/* invoice                                                             */
/* ------------------------------------------------------------------ */

export const buildInvoiceModel = (
  invoice: any,
  src: DocSourceData,
): InvoiceDocModel => {
  const { booking, customer, template } = src;
  const currency = invoice?.currency || booking?.currency || 'EGP';

  const rawItems: any[] = invoice?.invoice_items ?? [];
  const total = Number(invoice?.final_amount ?? 0);
  const lineItems: DocLineItem[] = rawItems.length
    ? rawItems.map((it) => ({
        description: String(it.description || 'بند'),
        quantity: Number(it.quantity ?? 1),
        unitPrice: Number(it.unit_price ?? 0),
        total: Number(it.total_price ?? Number(it.unit_price ?? 0) * Number(it.quantity ?? 1)),
      }))
    : [
        {
          description: [booking?.booking_type, booking?.destination]
            .filter(Boolean)
            .join(' — ') || `حجز ${booking?.booking_number ?? ''}`.trim(),
          quantity: 1,
          unitPrice: Number(invoice?.subtotal ?? total),
          total: Number(invoice?.subtotal ?? total),
        },
      ];

  const paid = Number(invoice?.total_paid_amount ?? 0);
  const balance = Number(invoice?.remaining_amount ?? Math.max(0, total - paid));
  const statusKey = String(invoice?.payment_status || invoice?.status || 'unpaid').toLowerCase();

  return {
    documentNumber: invoice?.invoice_number || String(invoice?.id ?? '').slice(0, 8),
    bookingReference: booking?.booking_number || undefined,
    issuedDate: fmtDate(invoice?.issued_date || invoice?.created_at),
    dueDate: fmtDate(invoice?.due_date),
    paymentStatus: {
      key: statusKey,
      ...(PAYMENT_STATUS[statusKey] || { labelAr: statusKey, labelEn: statusKey }),
    },
    brand: buildBrand(src.org),
    customer: {
      name: customer?.name || invoice?.customer_name || booking?.customer_name || 'عميل',
      phone: customer?.phone || undefined,
      email: customer?.email || undefined,
      nationality: customer?.nationality || undefined,
    },
    sections: buildSections(src),
    lineItems,
    totals: {
      currency,
      subtotal: Number(invoice?.subtotal ?? total),
      discount: Number(invoice?.discount_amount ?? 0),
      vat: Number(invoice?.vat_amount ?? 0),
      vatRate: Number(invoice?.vat_rate ?? 0),
      total,
      paid,
      balance,
    },
    customerNotes: [template?.notes_text, invoice?.payment_terms]
      .filter((v): v is string => !!v && String(v).trim().length > 0)
      .map(String),
    terms: template?.terms_text || undefined,
  };
};

/* ------------------------------------------------------------------ */
/* voucher — strictly money-free                                        */
/* ------------------------------------------------------------------ */

export const buildVoucherModel = (
  voucherNumber: string,
  src: DocSourceData,
  issuedAt?: string | null,
): VoucherDocModel => {
  const { booking, customer, template } = src;

  return {
    voucherNumber,
    bookingReference: booking?.booking_number || undefined,
    issuedDate: fmtDate(issuedAt || new Date().toISOString()),
    brand: buildBrand(src.org),
    traveler: {
      name: customer?.name || booking?.customer_name || 'عميل',
      phone: customer?.phone || undefined,
      email: customer?.email || undefined,
      nationality: customer?.nationality || undefined,
    },
    destination: booking?.destination || src.itinerary?.hotel?.city || undefined,
    travelStart: fmtDate(booking?.start_date),
    travelEnd: fmtDate(booking?.end_date),
    // scrubbed: guarantees no money-shaped fact can reach the voucher DOM/PDF
    sections: scrubSections(buildSections(src)),
    specialRequests: specialRequestLines(src.specialRequests),
    customerNotes: [template?.notes_text]
      .filter((v): v is string => !!v && String(v).trim().length > 0)
      .map(String),
    terms: template?.terms_text || undefined,
  };
};
