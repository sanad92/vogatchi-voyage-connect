const FIELD_LABELS: Record<string, string> = {
  contract_start_date: 'تاريخ بداية العقد',
  contract_end_date: 'تاريخ انتهاء العقد',
  start_date: 'تاريخ البداية',
  end_date: 'تاريخ الانتهاء',
  property_name: 'اسم العقار',
  property_address: 'عنوان العقار',
  landlord_name: 'اسم المالك',
  monthly_rent: 'الإيجار الشهري',
  organization_id: 'المؤسسة',
  amount: 'المبلغ',
  due_date: 'تاريخ الاستحقاق',
  description: 'الوصف',
  customer_name: 'اسم العميل',
  booking_number: 'رقم الحجز',
  booking_type: 'نوع الحجز',
};

export const getFriendlyDatabaseError = (error: unknown, fallback = 'حدث خطأ أثناء حفظ البيانات') => {
  const message = typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message || '')
    : String(error || '');

  const nullColumnMatch = message.match(/null value in column "([^"]+)"/);
  if (nullColumnMatch) {
    const column = nullColumnMatch[1];
    return `${FIELD_LABELS[column] || column} مطلوب. راجع البيانات قبل الحفظ.`;
  }

  const schemaColumnMatch = message.match(/Could not find the '([^']+)' column/);
  if (schemaColumnMatch) {
    const column = schemaColumnMatch[1];
    return `يوجد عدم توافق في حقل ${FIELD_LABELS[column] || column}. أعد تحميل الصفحة ثم جرّب مرة أخرى.`;
  }

  if (message.includes('violates row-level security policy') || message.includes('42501')) {
    return 'لا توجد صلاحية كافية أو لم يتم ربط السجل بالمؤسسة الحالية.';
  }

  if (message.includes('invalid input syntax')) {
    return 'صيغة إحدى القيم غير صحيحة. راجع الأرقام والتواريخ قبل الحفظ.';
  }

  return message || fallback;
};