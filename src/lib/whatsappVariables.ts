/**
 * Interpolates WhatsApp message variables like {{customer_name}}, {{agent_name}}, etc.
 * Unknown variables are left as-is so the user can fill them manually.
 *
 * Grouped variable sources: Customer, Booking, Hotel, Flight, Invoice, Payment,
 * Consultant, Company.
 */

export interface VariableContext {
  // Customer
  customer_name?: string | null;
  customer_first_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  customer_nationality?: string | null;

  // Consultant / agent
  agent_name?: string | null;
  agent_phone?: string | null;
  agent_email?: string | null;

  // Company / organization
  organization_name?: string | null;
  company_name?: string | null;
  company_phone?: string | null;
  company_website?: string | null;
  company_address?: string | null;

  // Date / time
  date?: string;
  time?: string;

  // Booking (generic)
  booking_reference?: string | null;
  booking_destination?: string | null;
  booking_check_in?: string | null;
  booking_check_out?: string | null;
  booking_travelers?: string | number | null;
  booking_status?: string | null;
  booking_total?: string | number | null;
  booking_currency?: string | null;

  // Hotel
  hotel_name?: string | null;
  hotel_city?: string | null;
  hotel_check_in?: string | null;
  hotel_check_out?: string | null;
  hotel_room_type?: string | null;
  hotel_nights?: string | number | null;
  hotel_voucher_number?: string | null;

  // Flight
  flight_number?: string | null;
  flight_airline?: string | null;
  flight_from?: string | null;
  flight_to?: string | null;
  flight_departure?: string | null;
  flight_arrival?: string | null;
  flight_pnr?: string | null;
  flight_ticket_number?: string | null;
  flight_class?: string | null;

  // Invoice
  invoice_number?: string | null;
  invoice_total?: string | number | null;
  invoice_currency?: string | null;
  invoice_due_date?: string | null;
  invoice_balance?: string | number | null;
  invoice_link?: string | null;

  // Payment
  payment_amount?: string | number | null;
  payment_currency?: string | null;
  payment_method?: string | null;
  payment_link?: string | null;
  payment_reference?: string | null;

  // Visa
  visa_country?: string | null;
  visa_type?: string | null;
  visa_reference?: string | null;
  visa_appointment_date?: string | null;

  // Marketing
  offer_title?: string | null;
  offer_price?: string | number | null;
  offer_link?: string | null;
  destination_name?: string | null;
}

export interface VariableGroup {
  key: string;
  label: string;
  variables: Array<{ key: keyof VariableContext; label: string; example: string }>;
}

export const VARIABLE_GROUPS: VariableGroup[] = [
  {
    key: 'customer',
    label: 'العميل',
    variables: [
      { key: 'customer_name', label: 'اسم العميل', example: 'أحمد محمد' },
      { key: 'customer_first_name', label: 'الاسم الأول', example: 'أحمد' },
      { key: 'customer_phone', label: 'رقم العميل', example: '+201...' },
      { key: 'customer_email', label: 'بريد العميل', example: 'a@x.com' },
      { key: 'customer_nationality', label: 'الجنسية', example: 'مصري' },
    ],
  },
  {
    key: 'consultant',
    label: 'المستشار',
    variables: [
      { key: 'agent_name', label: 'اسم المستشار', example: 'سارة' },
      { key: 'agent_phone', label: 'هاتف المستشار', example: '+201...' },
      { key: 'agent_email', label: 'بريد المستشار', example: 's@vogatchi.com' },
    ],
  },
  {
    key: 'company',
    label: 'الشركة',
    variables: [
      { key: 'company_name', label: 'اسم الشركة', example: 'Vogatchi' },
      { key: 'organization_name', label: 'اسم المؤسسة', example: 'Vogatchi' },
      { key: 'company_phone', label: 'هاتف الشركة', example: '+20...' },
      { key: 'company_website', label: 'الموقع', example: 'vogatchi.com' },
      { key: 'company_address', label: 'العنوان', example: 'القاهرة' },
    ],
  },
  {
    key: 'booking',
    label: 'الحجز',
    variables: [
      { key: 'booking_reference', label: 'رقم الحجز', example: 'BK-1024' },
      { key: 'booking_destination', label: 'الوجهة', example: 'دبي' },
      { key: 'booking_check_in', label: 'تاريخ الوصول', example: '2026-07-20' },
      { key: 'booking_check_out', label: 'تاريخ المغادرة', example: '2026-07-24' },
      { key: 'booking_travelers', label: 'عدد المسافرين', example: '2' },
      { key: 'booking_status', label: 'حالة الحجز', example: 'مؤكد' },
      { key: 'booking_total', label: 'إجمالي الحجز', example: '5000' },
      { key: 'booking_currency', label: 'العملة', example: 'EGP' },
    ],
  },
  {
    key: 'hotel',
    label: 'الفندق',
    variables: [
      { key: 'hotel_name', label: 'اسم الفندق', example: 'Atlantis' },
      { key: 'hotel_city', label: 'المدينة', example: 'دبي' },
      { key: 'hotel_check_in', label: 'الوصول', example: '2026-07-20' },
      { key: 'hotel_check_out', label: 'المغادرة', example: '2026-07-24' },
      { key: 'hotel_room_type', label: 'نوع الغرفة', example: 'Deluxe' },
      { key: 'hotel_nights', label: 'عدد الليالي', example: '4' },
      { key: 'hotel_voucher_number', label: 'رقم الڤاوتشر', example: 'V-2024' },
    ],
  },
  {
    key: 'flight',
    label: 'الطيران',
    variables: [
      { key: 'flight_number', label: 'رقم الرحلة', example: 'MS 985' },
      { key: 'flight_airline', label: 'شركة الطيران', example: 'EgyptAir' },
      { key: 'flight_from', label: 'من', example: 'CAI' },
      { key: 'flight_to', label: 'إلى', example: 'DXB' },
      { key: 'flight_departure', label: 'الإقلاع', example: '2026-07-20 14:30' },
      { key: 'flight_arrival', label: 'الوصول', example: '2026-07-20 19:45' },
      { key: 'flight_pnr', label: 'PNR', example: 'ABC123' },
      { key: 'flight_ticket_number', label: 'رقم التذكرة', example: '0741234567890' },
      { key: 'flight_class', label: 'الدرجة', example: 'Economy' },
    ],
  },
  {
    key: 'invoice',
    label: 'الفاتورة',
    variables: [
      { key: 'invoice_number', label: 'رقم الفاتورة', example: 'INV-2025-001' },
      { key: 'invoice_total', label: 'الإجمالي', example: '1500' },
      { key: 'invoice_currency', label: 'العملة', example: 'EGP' },
      { key: 'invoice_due_date', label: 'تاريخ الاستحقاق', example: '2026-08-01' },
      { key: 'invoice_balance', label: 'المتبقي', example: '500' },
      { key: 'invoice_link', label: 'رابط الفاتورة', example: 'https://...' },
    ],
  },
  {
    key: 'payment',
    label: 'الدفع',
    variables: [
      { key: 'payment_amount', label: 'المبلغ', example: '1000' },
      { key: 'payment_currency', label: 'العملة', example: 'EGP' },
      { key: 'payment_method', label: 'طريقة الدفع', example: 'Visa' },
      { key: 'payment_link', label: 'رابط الدفع', example: 'https://...' },
      { key: 'payment_reference', label: 'مرجع العملية', example: 'PAY-9911' },
    ],
  },
  {
    key: 'visa',
    label: 'التأشيرة',
    variables: [
      { key: 'visa_country', label: 'الدولة', example: 'الإمارات' },
      { key: 'visa_type', label: 'نوع التأشيرة', example: 'سياحية' },
      { key: 'visa_reference', label: 'المرجع', example: 'VISA-001' },
      { key: 'visa_appointment_date', label: 'موعد المقابلة', example: '2026-08-10' },
    ],
  },
  {
    key: 'marketing',
    label: 'التسويق',
    variables: [
      { key: 'offer_title', label: 'عنوان العرض', example: 'عرض الصيف' },
      { key: 'offer_price', label: 'سعر العرض', example: '4999' },
      { key: 'offer_link', label: 'رابط العرض', example: 'https://...' },
      { key: 'destination_name', label: 'الوجهة', example: 'تركيا' },
    ],
  },
];

// Legacy flat list, kept for backward compatibility with older UI code.
export const AVAILABLE_VARIABLES = VARIABLE_GROUPS.flatMap((g) => g.variables);

export const interpolateVariables = (template: string, ctx: VariableContext): string => {
  const now = new Date();
  const merged: VariableContext = {
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    ...ctx,
  };
  return template.replace(/\{\{\s*([a-z_0-9]+)\s*\}\}/gi, (match, key: string) => {
    const value = (merged as any)[key.toLowerCase()];
    return value != null && value !== '' ? String(value) : match;
  });
};
