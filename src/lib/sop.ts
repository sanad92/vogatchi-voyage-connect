// Vogatchi departmental SOP — shared vocabulary (labels, stages, checklists)

export type SopDepartment =
  | 'customer_service'
  | 'sales'
  | 'reservations'
  | 'operations'
  | 'management';

export type SopLeadStage =
  | 'new'
  | 'qualified'
  | 'assigned'
  | 'pricing_requested'
  | 'quoted'
  | 'follow_up'
  | 'accepted_pending_recheck'
  | 'rechecked'
  | 'payment_pending'
  | 'won'
  | 'lost'
  | 'cancelled';

export type SopHandoverType =
  | 'cs_to_sales'
  | 'sales_to_reservations'
  | 'reservations_to_sales'
  | 'reservations_to_cs';

export type SopApprovalType =
  | 'discount'
  | 'free_service'
  | 'booking_confirmation'
  | 'supplier_payment'
  | 'refund_compensation';

export type SopDeadlineType =
  | 'payment'
  | 'cancellation'
  | 'release'
  | 'pre_arrival'
  | 'reconfirmation';

export const DEPARTMENT_LABELS: Record<SopDepartment, string> = {
  customer_service: 'خدمة العملاء',
  sales: 'المبيعات',
  reservations: 'الحجوزات',
  operations: 'التشغيل',
  management: 'الإدارة',
};

export const LEAD_STAGE_LABELS: Record<SopLeadStage, string> = {
  new: 'جديد',
  qualified: 'مؤهل',
  assigned: 'مُسند للمبيعات',
  pricing_requested: 'طلب تسعير',
  quoted: 'تم عرض السعر',
  follow_up: 'متابعة / تفاوض',
  accepted_pending_recheck: 'موافقة بانتظار إعادة التأكد',
  rechecked: 'تمت إعادة التأكد',
  payment_pending: 'بانتظار التحصيل',
  won: 'محجوز (Won)',
  lost: 'مفقود',
  cancelled: 'ملغي',
};

export const PIPELINE_STAGES: SopLeadStage[] = [
  'qualified',
  'pricing_requested',
  'quoted',
  'follow_up',
  'accepted_pending_recheck',
  'rechecked',
  'payment_pending',
  'won',
];

export const LEAD_FLOW: SopLeadStage[] = [
  'new',
  'qualified',
  'assigned',
  'pricing_requested',
  'quoted',
  'follow_up',
  'accepted_pending_recheck',
  'rechecked',
  'payment_pending',
  'won',
];

export const HANDOVER_LABELS: Record<SopHandoverType, string> = {
  cs_to_sales: 'تسليم خدمة العملاء ← المبيعات',
  sales_to_reservations: 'تسليم المبيعات ← الحجوزات',
  reservations_to_sales: 'تسليم الحجوزات ← المبيعات',
  reservations_to_cs: 'تسليم الحجوزات ← خدمة العملاء (ما بعد البيع)',
};

/** Which departments a handover moves the file between. */
export const HANDOVER_FLOW: Record<SopHandoverType, { from: SopDepartment; to: SopDepartment }> = {
  cs_to_sales: { from: 'customer_service', to: 'sales' },
  sales_to_reservations: { from: 'sales', to: 'reservations' },
  reservations_to_sales: { from: 'reservations', to: 'sales' },
  reservations_to_cs: { from: 'reservations', to: 'customer_service' },
};

/** Plain-language next step for each blocking violation. */
export const VIOLATION_GUIDANCE: Record<string, string> = {
  no_sales_assignment: 'اعمل إسناد بالتناوب لمندوب مبيعات.',
  handover_cs_to_sales_incomplete: 'أكمل تسليم خدمة العملاء ← المبيعات أولًا.',
  handover_sales_to_reservations_incomplete: 'أكمل تسليم المبيعات ← الحجوزات أولًا.',
  handover_reservations_to_sales_incomplete: 'أكمل تسليم الحجوزات ← المبيعات أولًا.',
  no_pricing_request: 'أرسل طلب تسعير لقسم الحجوزات.',
  pricing_not_completed: 'قسم الحجوزات لازم ينشر التسعير.',
  no_pricing_options: 'أضف خيار تسعير واحد على الأقل.',
  more_than_three_options: 'قلل الخيارات إلى 3 كحد أقصى.',
  recheck_not_completed: 'اطلب إعادة تأكد من الحجوزات.',
  requote_required: 'مطلوب إعادة تسعير قبل التحصيل.',
  management_booking_approval_missing: 'اطلب موافقة الإدارة على الحجز.',
  collection_condition_not_met: 'سجّل الدفعة المطلوبة حسب سياسة الدفع.',
  price_validity_expired: 'صلاحية السعر انتهت — اطلب إعادة تسعير.',
  intake_incomplete: 'أكمل بيانات الاستقبال الناقصة.',
  brief_incomplete: 'أكمل بيانات الـ Brief الناقصة.',
  already_claimed: 'تم استلام هذا الملف بواسطة زميل قبلك.',
  lead_already_in_pipeline: 'الملف بالفعل داخل خط الأنابيب.',
  not_available_sales_member: 'الاستلام متاح لموظفي المبيعات المتاحين فقط.',
  not_available_reservations_member: 'الاستلام متاح لموظفي الحجوزات المتاحين فقط.',
  not_sales_member: 'اطلب من المدير إضافتك لقسم المبيعات من صفحة فريق العمل.',
  sales_member_unavailable: 'فعّل حالة «متاح» عشان تقدر تستلم عملاء جدد.',
  not_reservations_member: 'اطلب من المدير إضافتك لقسم الحجوزات من صفحة فريق العمل.',
  reservations_member_unavailable: 'فعّل حالة «متاح» عشان تقدر تستلم طلبات التسعير.',
  not_department_member: 'حسابك غير مسجّل في هذا القسم.',

  pricing_not_published: 'انشر التسعير أولًا قبل الإرسال للمبيعات.',
};


export const HANDOVER_CHECKLISTS: Record<SopHandoverType, { key: string; label: string }[]> = {
  cs_to_sales: [
    { key: 'intake_complete', label: 'بيانات الاستقبال مكتملة' },
    { key: 'contact_verified', label: 'تم التحقق من بيانات التواصل' },
    { key: 'priorities_captured', label: 'أولويات العميل مسجلة' },
    { key: 'source_captured', label: 'مصدر العميل / الحملة مسجل' },
  ],
  sales_to_reservations: [
    { key: 'brief_complete', label: 'الـ Brief مكتمل' },
    { key: 'budget_confirmed', label: 'الميزانية / مستوى الخدمة مؤكد' },
    { key: 'special_requests_listed', label: 'الطلبات الخاصة مسجلة' },
    { key: 'dates_confirmed', label: 'التواريخ مؤكدة' },
  ],
  reservations_to_sales: [
    { key: 'options_provided', label: 'تم تقديم الخيارات (بحد أقصى 3)' },
    { key: 'policies_documented', label: 'سياسات الإلغاء موثقة' },
    { key: 'price_validity_set', label: 'صلاحية السعر محددة' },
    { key: 'recommendation_given', label: 'توصية الحجوزات موجودة' },
  ],
  reservations_to_cs: [
    { key: 'voucher_attached', label: 'الفاوتشر / التأكيد مرفق' },
    { key: 'guest_names', label: 'أسماء الضيوف' },
    { key: 'dates_and_service', label: 'التواريخ ونوع الخدمة' },
    { key: 'room_and_meals', label: 'نوع الغرفة والوجبات' },
    { key: 'special_requests_status', label: 'حالة الطلبات الخاصة' },
    { key: 'transfers_meeting_points', label: 'الانتقالات ونقاط اللقاء' },
    { key: 'supplier_emergency_contact', label: 'جهة اتصال المورد / الطوارئ' },
    { key: 'outstanding_balance', label: 'المبلغ المتبقي والإجراءات' },
  ],
};

export const APPROVAL_LABELS: Record<SopApprovalType, string> = {
  discount: 'خصم',
  free_service: 'خدمة مجانية',
  booking_confirmation: 'تأكيد الحجز',
  supplier_payment: 'دفع المورد',
  refund_compensation: 'استرداد / تعويض',
};

export const DEADLINE_LABELS: Record<SopDeadlineType, string> = {
  payment: 'موعد السداد للمورد',
  cancellation: 'موعد الإلغاء',
  release: 'موعد الإفراج (Release)',
  pre_arrival: 'ما قبل الوصول',
  reconfirmation: 'إعادة التأكيد',
};

export const PAYMENT_POLICY_LABELS: Record<string, string> = {
  full: 'سداد كامل',
  deposit: 'دفعة مقدمة',
  credit: 'آجل (ائتمان)',
  exception: 'استثناء معتمد',
};

/** Arabic labels for the exact field keys returned by the database gates. */
export const MISSING_FIELD_LABELS: Record<string, string> = {
  contact_name: 'اسم العميل',
  contact_phone_or_email: 'هاتف أو بريد العميل',
  destination_or_city: 'الوجهة / المدينة',
  dates_or_approx_dates: 'تواريخ السفر أو تواريخ تقريبية',
  dates: 'التواريخ',
  adults: 'عدد البالغين',
  children_ages: 'أعمار الأطفال',
  rooms: 'عدد الغرف',
  budget_or_service_level: 'الميزانية / مستوى الخدمة',
  priorities: 'أولويات العميل',
  lead_source: 'مصدر العميل',
  nationality_or_market: 'الجنسية / السوق',
  rooms_or_occupancy: 'الغرف / التوزيع',
  lost_reason: 'سبب الفقد',
};

export const VIOLATION_LABELS: Record<string, string> = {
  lead_not_found: 'العميل المحتمل غير موجود',
  no_sales_assignment: 'لا يوجد إسناد لمندوب مبيعات',
  handover_cs_to_sales_incomplete: 'تسليم خدمة العملاء ← المبيعات غير مكتمل',
  handover_sales_to_reservations_incomplete: 'تسليم المبيعات ← الحجوزات غير مكتمل',
  handover_reservations_to_sales_incomplete: 'تسليم الحجوزات ← المبيعات غير مكتمل',
  no_pricing_request: 'لا يوجد طلب تسعير',
  pricing_not_completed: 'التسعير لم يكتمل من الحجوزات',
  no_pricing_options: 'لا توجد خيارات تسعير',
  more_than_three_options: 'عدد الخيارات يتجاوز 3',
  no_quote_linked: 'لا يوجد عرض سعر مرتبط',
  recheck_not_completed: 'لم تتم إعادة التأكد (Recheck)',
  requote_required: 'مطلوب إعادة تسعير قبل التحصيل',
  management_booking_approval_missing: 'موافقة الإدارة على الحجز مفقودة',
  collection_condition_not_met: 'شرط التحصيل غير مستوفى',
  no_booking_created: 'لم يتم إنشاء الحجز',
  intake_incomplete: 'بيانات الاستقبال غير مكتملة',
  brief_incomplete: 'الـ Brief غير مكتمل',
  exception_reason_required: 'سبب الاستثناء مطلوب',
  reassignment_reason_required: 'سبب إعادة الإسناد مطلوب',
  no_available_sales_member: 'لا يوجد مندوب مبيعات متاح',
  reservations_only: 'هذا الإجراء مخصص لقسم الحجوزات',
  management_only: 'هذا الإجراء مخصص للإدارة',
  no_options: 'لا توجد خيارات',
  options_missing_net_cost_or_policy: 'خيارات بدون صافي التكلفة أو السياسة',
  no_recommended_option: 'لا يوجد خيار موصى به',
  no_booking: 'لا يوجد حجز مرتبط',
  price_validity_required: 'صلاحية السعر مطلوبة',
  price_validity_expired: 'صلاحية السعر منتهية',
  voucher_not_issued: 'لم يتم إصدار الفاوتشر بعد',
  assignee_required: 'يجب اختيار مندوب المبيعات',
  assignee_not_available_sales: 'المستخدم ليس ضمن فريق المبيعات المتاح',
  assignee_unchanged: 'نفس المندوب الحالي',
  user_not_in_organization: 'المستخدم ليس عضوًا في المؤسسة',
  user_not_in_department: 'المستخدم غير معين لأي قسم',
  no_organization: 'لا توجد مؤسسة نشطة',
};

export const labelMissing = (k: string) => MISSING_FIELD_LABELS[k] ?? k;
export const labelViolation = (v: string) => {
  if (v.startsWith('transition_not_allowed:')) {
    const [, pair] = v.split(':');
    const [from, to] = pair.split('->') as [SopLeadStage, SopLeadStage];
    return `انتقال غير مسموح: ${LEAD_STAGE_LABELS[from] ?? from} ← ${LEAD_STAGE_LABELS[to] ?? to}`;
  }
  return VIOLATION_LABELS[v] ?? v;
};

export interface GateResult {
  allowed: boolean;
  from?: SopLeadStage;
  to?: SopLeadStage;
  missing_fields?: string[];
  violations?: string[];
  collection?: {
    policy: string;
    due: number;
    paid: number;
    required: number;
    satisfied: boolean;
    requires_approval: boolean;
    approval_granted: boolean;
    deposit_percent: number;
  } | null;
  [k: string]: unknown;
}

/** Which department owns a lead at a given stage — used for the ownership badge. */
export const stageOwnerDepartment = (stage: SopLeadStage): SopDepartment => {
  switch (stage) {
    case 'new':
    case 'qualified':
      return 'customer_service';
    case 'pricing_requested':
      return 'reservations';
    case 'won':
      return 'operations';
    case 'lost':
    case 'cancelled':
      return 'management';
    default:
      return 'sales';
  }
};

/** The next required SOP action, mirroring the database gates. */
export const nextRequiredAction = (stage: SopLeadStage): string => {
  switch (stage) {
    case 'new':
      return 'استكمال بيانات الاستقبال ثم التأهيل';
    case 'qualified':
      return 'تسليم خدمة العملاء ← المبيعات ثم الإسناد بالتناوب';
    case 'assigned':
      return 'مراجعة الـ Brief وإرسال طلب تسعير للحجوزات';
    case 'pricing_requested':
      return 'الحجوزات: إضافة الخيارات ونشر التسعير';
    case 'quoted':
      return 'إرسال الخيارات للعميل ومتابعة القرار';
    case 'follow_up':
      return 'متابعة مجدولة حتى القبول أو الفقد';
    case 'accepted_pending_recheck':
      return 'طلب إعادة تأكد (Recheck) من الحجوزات';
    case 'rechecked':
      return 'طلب موافقة الإدارة على الحجز';
    case 'payment_pending':
      return 'تحصيل المبلغ المطلوب حسب سياسة الدفع';
    case 'won':
      return 'تسليم الحجوزات ← خدمة العملاء وتشغيل الأتمتة';
    default:
      return 'لا يوجد إجراء مطلوب';
  }
};
