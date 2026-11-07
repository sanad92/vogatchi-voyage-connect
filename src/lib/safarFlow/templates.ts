import type { FlowTemplate, FlowSampleEvent } from './engine';

/**
 * V0 template catalogue — no live execution or external service connections.
 * All values used for previews are fabricated examples, never customer records.
 */
export const SAFAR_FLOW_TEMPLATES: FlowTemplate[] = [
  {
    id: 'quote-follow-up',
    title: 'متابعة عرض السعر',
    description: 'بعد 24 ساعة من إرسال العرض، راجع حالته ورد العميل قبل إنشاء مهمة متابعة.',
    category: 'sales',
    trigger: 'quote.sent',
    delayMinutes: 1440,
    recheckAfterDelay: true,
    conditions: [
      { path: 'quote.status', operator: 'eq', value: 'sent' },
      { path: 'customer.replied', operator: 'eq', value: false },
    ],
    actions: [
      { id: 'create-quote-task', type: 'create_task', label: 'إنشاء مهمة لموظف المبيعات لمتابعة العميل' },
    ],
  },
  {
    id: 'supplier-confirmation',
    title: 'تأكيد حجوزات الموردين',
    description: 'بعد إنشاء الحجز، راجع حالة تأكيد المورد واترك مهمة متابعة إذا لم يتم التأكيد.',
    category: 'operations',
    trigger: 'booking.created',
    delayMinutes: 180,
    recheckAfterDelay: true,
    conditions: [
      { path: 'booking.supplierConfirmed', operator: 'eq', value: false },
    ],
    actions: [
      { id: 'notify-reservations', type: 'notify_staff', label: 'تنبيه مسؤول التشغيل بالتأكيد المعلق' },
      { id: 'create-supplier-task', type: 'create_task', label: 'إنشاء مهمة متابعة مرجع المورد' },
    ],
  },
  {
    id: 'supplier-payment',
    title: 'مدفوعات الموردين',
    description: 'مراجعة استحقاقات الموردين مع الحسابات؛ بدون إجراء دفع أو تغيير رصيد تلقائي.',
    category: 'finance',
    trigger: 'supplier.payment_due',
    delayMinutes: 0,
    recheckAfterDelay: true,
    conditions: [
      { path: 'payment.outstanding', operator: 'gte', value: 1 },
    ],
    actions: [
      { id: 'payment-task', type: 'create_task', label: 'إنشاء مهمة لسداد المورد والتحقق من المستحق' },
      { id: 'payment-review', type: 'request_review', label: 'طلب اعتماد موظف الحسابات قبل أي دفع', reviewRequired: true },
    ],
  },
  {
    id: 'whatsapp-intake',
    title: 'استخراج طلب السفر من واتساب',
    description: 'تجهيز مسودة طلب سفر قابلة للمراجعة، دون إرسال رد أو تنفيذ حجز تلقائي.',
    category: 'ai',
    trigger: 'whatsapp.inbound',
    delayMinutes: 0,
    recheckAfterDelay: false,
    conditions: [
      { path: 'message.travelIntent', operator: 'eq', value: true },
    ],
    actions: [
      { id: 'draft-travel-request', type: 'draft_request', label: 'إعداد مسودة بيانات السفر من الرسالة', reviewRequired: true },
      { id: 'review-travel-request', type: 'request_review', label: 'مراجعة موظف المبيعات للبيانات المستخرجة', reviewRequired: true },
    ],
  },
  {
    id: 'pre-travel-checklist',
    title: 'مراجعة المستندات قبل السفر',
    description: 'مراجعة التذاكر والفواتشر والانتقالات قبل موعد السفر بمدة محددة.',
    category: 'operations',
    trigger: 'booking.pre_travel',
    delayMinutes: 0,
    recheckAfterDelay: true,
    conditions: [
      { path: 'booking.status', operator: 'neq', value: 'cancelled' },
      { path: 'booking.hoursUntilTravel', operator: 'lte', value: 72 },
    ],
    actions: [
      { id: 'travel-checklist', type: 'prepare_checklist', label: 'تجهيز قائمة مراجعة التذاكر والفواتشر والانتقالات' },
      { id: 'travel-notify', type: 'notify_staff', label: 'تنبيه مسؤول التشغيل بالملفات الناقصة' },
    ],
  },
];

export const SAFAR_FLOW_SAMPLES: FlowSampleEvent[] = [
  {
    id: 'quote-unanswered',
    label: 'عرض سعر منتظر رد',
    type: 'quote.sent',
    payload: { quote: { status: 'sent' }, customer: { replied: false } },
  },
  {
    id: 'quote-answered',
    label: 'عرض سعر تم الرد عليه',
    type: 'quote.sent',
    payload: { quote: { status: 'sent' }, customer: { replied: true } },
  },
  {
    id: 'booking-pending',
    label: 'حجز بدون تأكيد المورد',
    type: 'booking.created',
    payload: { booking: { supplierConfirmed: false } },
  },
  {
    id: 'booking-confirmed',
    label: 'حجز مؤكد من المورد',
    type: 'booking.created',
    payload: { booking: { supplierConfirmed: true } },
  },
  {
    id: 'supplier-due',
    label: 'مورد له مستحقات',
    type: 'supplier.payment_due',
    payload: { payment: { outstanding: 1200 } },
  },
  {
    id: 'supplier-settled',
    label: 'مورد تم سداده',
    type: 'supplier.payment_due',
    payload: { payment: { outstanding: 0 } },
  },
  {
    id: 'whatsapp-travel',
    label: 'رسالة تحتوي على طلب سفر',
    type: 'whatsapp.inbound',
    payload: { message: { travelIntent: true } },
  },
  {
    id: 'whatsapp-other',
    label: 'رسالة عامة بدون طلب سفر',
    type: 'whatsapp.inbound',
    payload: { message: { travelIntent: false } },
  },
  {
    id: 'pretravel-upcoming',
    label: 'سفر خلال 48 ساعة',
    type: 'booking.pre_travel',
    payload: { booking: { status: 'confirmed', hoursUntilTravel: 48 } },
  },
  {
    id: 'pretravel-cancelled',
    label: 'رحلة ملغاة',
    type: 'booking.pre_travel',
    payload: { booking: { status: 'cancelled', hoursUntilTravel: 48 } },
  },
];
