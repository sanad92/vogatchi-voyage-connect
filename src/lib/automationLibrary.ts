export const AUTOMATION_CATEGORIES = [
  { key: 'bookings', label: 'الحجوزات' },
  { key: 'collections', label: 'تحصيل العملاء' },
  { key: 'suppliers', label: 'الموردون' },
  { key: 'travel', label: 'السفر والمتابعة' },
  { key: 'sales', label: 'المبيعات' },
] as const;

export type AutomationCategory = typeof AUTOMATION_CATEGORIES[number]['key'];

export const AUTOMATION_LIBRARY = [
  {
    key: 'confirmed_booking',
    category: 'bookings',
    name: 'مراجعة الحجز المؤكد',
    description: 'عند التأكيد، ينشئ مهمة لمراجعة بيانات العميل وتأكيد المورد خلال ساعتين.',
  },
  {
    key: 'pending_booking',
    category: 'bookings',
    name: 'متابعة الحجز المعلّق',
    description: 'لو حجز جديد فضل معلّق ٢٤ ساعة ولسه موعده ما فاتش، ينشئ مهمة لمتابعة التأكيد.',
  },
  {
    key: 'payment_due',
    category: 'collections',
    name: 'متابعة تحصيل فاتورة مستحقة',
    description: 'يوم الاستحقاق، ينشئ مهمة للفاتورة اللي عليها مبلغ متبقّي. تُغلق بعد السداد أو الإلغاء.',
  },
  {
    key: 'supplier_payment_due',
    category: 'suppliers',
    name: 'اقتراب مهلة سداد المورد',
    description: 'قبل الاستحقاق بـ٢٤ ساعة، ينشئ مهمة لمتابعة أمر دفع المورد المفتوح.',
  },
  {
    key: 'free_cancellation_due',
    category: 'suppliers',
    name: 'اقتراب نهاية الإلغاء المجاني',
    description: 'ينشئ مهمة قبل أقرب مهلة إلغاء مجاني للمورد بـ٢٤ ساعة حسب الشروط المسجلة بالحجز.',
  },
  {
    key: 'pre_travel',
    category: 'travel',
    name: 'مراجعة تجهيزات ما قبل السفر',
    description: 'قبل السفر بـ٣ أيام، ينشئ مهمة لمراجعة الوثائق والفوتشرات ومواعيد الرحلة.',
  },
  {
    key: 'post_travel',
    category: 'travel',
    name: 'متابعة العميل بعد الرحلة',
    description: 'بعد انتهاء الحجز المكتمل، ينشئ مهمة لمتابعة تجربة العميل.',
  },
] as const satisfies ReadonlyArray<{ key: string; category: AutomationCategory; name: string; description: string }>;

export type LibraryRuleKey = typeof AUTOMATION_LIBRARY[number]['key'];

export const QUOTE_FOLLOWUP = {
  name: 'متابعة عروض الأسعار',
  description: 'يجدول متابعة العروض المرسلة على المواعيد اللي بتحددها الشركة من إعدادات العروض.',
};
