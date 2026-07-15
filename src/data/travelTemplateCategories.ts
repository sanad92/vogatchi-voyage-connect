import {
  Megaphone,
  BedDouble,
  Plane,
  Wallet,
  Stamp,
  Headphones,
  Users,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

export type TemplateCategoryKey =
  | 'marketing'
  | 'booking_hotels'
  | 'flights'
  | 'payments'
  | 'visas'
  | 'customer_service'
  | 'crm_followups'
  | 'seasonal';

export interface TemplateCategoryMeta {
  key: TemplateCategoryKey;
  labelAr: string;
  labelEn: string;
  description: string;
  icon: LucideIcon;
  color: string;
}

export const TEMPLATE_CATEGORIES: TemplateCategoryMeta[] = [
  {
    key: 'marketing',
    labelAr: 'التسويق',
    labelEn: 'Marketing',
    description: 'حملات ترويجية، إطلاق وجهات، وعروض حصرية',
    icon: Megaphone,
    color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400',
  },
  {
    key: 'booking_hotels',
    labelAr: 'الحجوزات والفنادق',
    labelEn: 'Booking & Hotels',
    description: 'تأكيدات، ڤاوتشرات، تذكيرات وصول ومغادرة',
    icon: BedDouble,
    color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  {
    key: 'flights',
    labelAr: 'الطيران',
    labelEn: 'Flights',
    description: 'إصدار تذاكر، تغييرات، تذكيرات إقلاع',
    icon: Plane,
    color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
  {
    key: 'payments',
    labelAr: 'المدفوعات',
    labelEn: 'Payments',
    description: 'روابط دفع، تذكيرات، إيصالات واسترداد',
    icon: Wallet,
    color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  {
    key: 'visas',
    labelAr: 'التأشيرات',
    labelEn: 'Visas',
    description: 'طلب مستندات، حالة الطلب، مواعيد المقابلات',
    icon: Stamp,
    color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  {
    key: 'customer_service',
    labelAr: 'خدمة العملاء',
    labelEn: 'Customer Service',
    description: 'ترحيب، تحويل، خارج الدوام، تقييم الخدمة',
    icon: Headphones,
    color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  },
  {
    key: 'crm_followups',
    labelAr: 'متابعة العملاء',
    labelEn: 'CRM Follow-ups',
    description: 'متابعة عروض، إعادة تفاعل، مناسبات شخصية',
    icon: Users,
    color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
  },
  {
    key: 'seasonal',
    labelAr: 'حملات موسمية',
    labelEn: 'Seasonal',
    description: 'رمضان، العيد، الحج، الصيف والمناسبات الوطنية',
    icon: Sparkles,
    color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
];

export const categoryMeta = (key: string): TemplateCategoryMeta | undefined =>
  TEMPLATE_CATEGORIES.find((c) => c.key === key);
