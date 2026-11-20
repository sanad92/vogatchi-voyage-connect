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
export type TravelServiceKind = Exclude<DocSectionKind, 'service'>;

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
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? 'UTC' : undefined,
  });
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
  if (!v || v.toLowerCase() === 'null') return null;
  if (UUID_RE.test(v)) return null;
  return { label, value: v };
};


const facts = (...rows: (DocFact | null)[]): DocFact[] => rows.filter(Boolean) as DocFact[];

const dateAndTime = (date?: string | null, time?: string | null) =>
  [fmtDate(date), time].filter(Boolean).join(' ');

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

type ServiceText = string | null;
type ServiceNumber = number | null;
export interface TravelItinerary {
  hotel?: {
    id?: string;
    hotel_name?: ServiceText;
    city?: ServiceText;
    star_rating?: ServiceNumber;
    check_in?: ServiceText;
    check_out?: ServiceText;
    nights?: ServiceNumber;
    rooms?: ServiceNumber;
    room_type?: ServiceText;
    room_view?: ServiceText;
    meal_plan?: ServiceText;
    board_type?: ServiceText;
    adults?: ServiceNumber;
    children?: ServiceNumber;
    children_ages?: ServiceText;
    booking_reference?: ServiceText;
    cancellation_policy?: ServiceText;
  } | null;
  flight?: {
    id?: string;
    airline?: ServiceText;
    arrival_airport?: ServiceText;
    arrival_date?: ServiceText;
    arrival_time?: ServiceText;
    departure_airport?: ServiceText;
    departure_date?: ServiceText;
    departure_time?: ServiceText;
    flight_class?: ServiceText;
    flight_number?: ServiceText;
    is_round_trip?: boolean | null;
    meal_preferences?: ServiceText;
    passengers_count?: ServiceNumber;
    pnr?: ServiceText;
    seat_preferences?: ServiceText;
    ticket_number?: ServiceText;
    ticket_numbers?: string[];
    return_flight_number?: ServiceText;
    return_departure_airport?: ServiceText;
    return_arrival_airport?: ServiceText;
    return_departure_date?: ServiceText;
    return_departure_time?: ServiceText;
    return_arrival_date?: ServiceText;
    return_arrival_time?: ServiceText;
  } | null;
  transport?: {
    id?: string;
    vehicle_type?: ServiceText;
    route?: ServiceText;
    pickup_point?: ServiceText;
    pickup_date?: ServiceText;
    pickup_time?: ServiceText;
    dropoff_point?: ServiceText;
    dropoff_date?: ServiceText;
    dropoff_time?: ServiceText;
    passengers?: ServiceNumber;
    reference?: ServiceText;
  } | null;
  car?: {
    id?: string;
    car_type?: ServiceText;
    pickup_location?: ServiceText;
    pickup_date?: ServiceText;
    dropoff_location?: ServiceText;
    dropoff_date?: ServiceText;
    insurance_included?: boolean | null;
    reference?: ServiceText;
  } | null;
}

export interface LinkedItineraryService {
  kind: TravelServiceKind;
  id: string;
  cancelled: boolean;
  updatedAt?: string | null;
  itinerary: TravelItinerary;
}

export interface TravelServiceAmendment {
  service_kind: TravelServiceKind;
  service_id: string;
  service_source: 'linked' | 'detail';
  ticket_number: string | null;
  operation: 'change' | 'cancel';
  start_date: string | null;
  end_date: string | null;
  applied_at?: string | null;
}

export interface TravelServiceSection extends DocSection {
  kind: TravelServiceKind;
  serviceId: string;
  source: 'linked' | 'detail';
  cancelled: boolean;
}

export interface DocSpecialRequest {
  booking_id?: string | null;
  custom_request_text?: string | null;
  special_request_type?: { name: string } | null;
  hotel?: { hotel_name: string | null } | null;
}

export interface DocSourceData {
  booking: any;
  customer?: any;
  itinerary?: TravelItinerary | null;
  linkedServices?: LinkedItineraryService[];
  amendments?: TravelServiceAmendment[];
  org?: any;
  /** rows of booking_special_requests joined with special_request_types */
  specialRequests?: DocSpecialRequest[];
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

/** Only values explicitly listed here reach customer-facing documents. */
const buildItinerarySections = (itinerary: TravelItinerary | null | undefined): DocSection[] => {
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
        fact('المغادرة', dateAndTime(f.departure_date, f.departure_time)),
        fact('الوصول', dateAndTime(f.arrival_date, f.arrival_time)),
        fact('درجة السفر', f.flight_class),
        fact('عدد المسافرين', f.passengers_count),
        fact('نوع الرحلة', f.is_round_trip ? 'ذهاب وعودة' : undefined),
        fact('رمز الحجز (PNR)', f.pnr),
        fact('التذاكر', [f.ticket_number, ...(f.ticket_numbers ?? [])].filter(Boolean).join('، ')),
        fact('تفضيلات المقاعد', f.seat_preferences),
        fact('تفضيلات الوجبات', f.meal_preferences),
        fact('رقم رحلة العودة', f.return_flight_number),
        fact('مسار العودة', [f.return_departure_airport, f.return_arrival_airport].filter(Boolean).join(' → ')),
        fact('مغادرة رحلة العودة', dateAndTime(f.return_departure_date, f.return_departure_time)),
        fact('وصول رحلة العودة', dateAndTime(f.return_arrival_date, f.return_arrival_time)),
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
        fact('موعد الاستلام', dateAndTime(t.pickup_date, t.pickup_time)),
        fact('نقطة التوصيل', t.dropoff_point),
        fact('موعد التوصيل', dateAndTime(t.dropoff_date, t.dropoff_time)),
        fact('عدد الركاب', t.passengers),
        fact('مرجع الانتقال', t.reference),
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
        fact('مرجع التأجير', c.reference),
      ),
    });
  }

  return sections;
};

const serviceKinds: TravelServiceKind[] = ['hotel', 'flight', 'transport', 'car'];
const serviceTitles: Record<string, string> = {
  hotel: 'الإقامة الفندقية', flight: 'رحلة الطيران', transport: 'خدمة الانتقالات',
  car_rental: 'تأجير سيارة', umrah: 'العمرة', hajj: 'الحج', package: 'برنامج سياحي',
};

const legacyTables: Record<TravelServiceKind, string> = {
  hotel: 'hotel_bookings', flight: 'flight_bookings', transport: 'transport_bookings', car: 'car_rentals',
};

/** The workspace shows canceled services, while a current voucher excludes them. */
export const getTravelServiceSections = (src: DocSourceData): TravelServiceSection[] => {
  const details = serviceKinds.flatMap<LinkedItineraryService & { source: 'detail' }>(kind => {
    const row = src.itinerary?.[kind];
    if (!row) return [];
    // A migrated legacy row may also be linked to its own workspace booking.
    const duplicate = src.booking?.legacy_table === legacyTables[kind] &&
      src.linkedServices?.some(service => service.kind === kind && service.id === src.booking?.legacy_id);
    if (duplicate) return [];
    return [{ kind, id: row.id ?? kind, source: 'detail' as const, cancelled: false, itinerary: { [kind]: row } }];
  });
  const linked = (src.linkedServices ?? []).map(service => ({ ...service, source: 'linked' as const }));

  return [...details, ...linked].flatMap(service => {
    const mirrorId = service.source === 'linked' && src.booking?.legacy_table === legacyTables[service.kind] &&
      src.booking?.legacy_id === service.id ? src.itinerary?.[service.kind]?.id : undefined;
    const history = (src.amendments ?? []).filter(entry =>
      entry.service_kind === service.kind && (
        (entry.service_id === service.id && entry.service_source === service.source) ||
        (entry.service_id === mirrorId && entry.service_source === 'detail')
      ));
    const itinerary: TravelItinerary = { ...service.itinerary };
    if (itinerary.transport && service.source === 'detail') {
      const latestChange = history.find(entry => entry.operation === 'change' && !entry.ticket_number);
      itinerary.transport = {
        ...itinerary.transport,
        pickup_date: latestChange?.start_date ?? itinerary.transport.pickup_date ?? src.booking?.start_date,
        dropoff_date: latestChange?.end_date ?? itinerary.transport.dropoff_date ?? src.booking?.end_date,
      };
    }
    const cancelledTickets = new Set(history.filter(entry => entry.operation === 'cancel').map(entry => entry.ticket_number));
    const savedTickets = itinerary.flight
      ? [itinerary.flight.ticket_number, ...(itinerary.flight.ticket_numbers ?? [])]
        .filter((ticket): ticket is string => Boolean(ticket))
      : [];
    const activeTickets = savedTickets.filter(ticket => !cancelledTickets.has(ticket));
    const cancelled = service.cancelled || cancelledTickets.has(null) ||
      (savedTickets.length > 0 && activeTickets.length === 0);
    if (itinerary.flight) {
      itinerary.flight = { ...itinerary.flight, ticket_number: undefined, ticket_numbers: activeTickets };
    }
    return buildItinerarySections(itinerary).map(section => ({
      ...section, kind: service.kind, serviceId: service.id, source: service.source, cancelled,
    }));
  });
};

export const voucherCopyIsStale = (src: DocSourceData, savedAt: string) => {
  const savedTime = Date.parse(savedAt);
  const timestamps = [
    ...(src.linkedServices ?? []).map(service => service.updatedAt),
    ...(src.amendments ?? []).map(amendment => amendment.applied_at),
  ];
  return !Number.isFinite(savedTime) || timestamps.some(timestamp =>
    Boolean(timestamp && Date.parse(timestamp) > savedTime));
};

const fallbackSection = (booking: DocSourceData['booking']): DocSection => ({
  kind: 'service',
  title: serviceTitles[booking?.booking_type] || 'تفاصيل الخدمة',
  subtitle: booking?.destination || undefined,
  facts: facts(
    fact('الوجهة', booking?.destination),
    fact('تاريخ البداية', fmtDate(booking?.start_date)),
    fact('تاريخ النهاية', fmtDate(booking?.end_date)),
  ),
});

export const buildSections = (src: DocSourceData): DocSection[] => {
  const sections = buildItinerarySections(src.itinerary);
  return sections.length ? sections : [fallbackSection(src.booking)];
};

const specialRequestLines = (rows: DocSpecialRequest[] = []): string[] => {
  const multipleHotels = new Set(rows.map(row => row.booking_id).filter(Boolean)).size > 1;
  return [...new Set(rows.flatMap(row => {
    const request = [row.special_request_type?.name, row.custom_request_text].filter(Boolean).join(' — ').trim();
    if (!request) return [];
    return [multipleHotels && row.hotel?.hotel_name ? `${row.hotel.hotel_name}: ${request}` : request];
  }))];
};

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
  const services = getTravelServiceSections(src);
  const activeServices = services.filter(service => !service.cancelled);
  const cancelledHotelIds = new Set(services.filter(service =>
    service.kind === 'hotel' && service.cancelled).map(service =>
      service.source === 'linked' ? service.serviceId : booking?.legacy_id));
  const activeSections: DocSection[] = services.length
    ? activeServices.map(({ kind, title, subtitle, facts, notes }) => ({ kind, title, subtitle, facts, notes }))
    : [fallbackSection(booking)];

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
    sections: scrubSections(activeSections),
    specialRequests: specialRequestLines(src.specialRequests?.filter(request =>
      !request.booking_id || !cancelledHotelIds.has(request.booking_id))),
    customerNotes: [template?.notes_text]
      .filter((v): v is string => !!v && String(v).trim().length > 0)
      .map(String),
    terms: template?.terms_text || undefined,
  };
};
