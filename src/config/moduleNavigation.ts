import type { ElementType } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  Calendar,
  Car,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  FileCheck,
  FileText,
  FolderOpen,
  GitBranch,
  History,
  Hotel,
  Landmark,
  LayoutDashboard,
  ListTodo,
  Lock,
  Megaphone,
  MessageSquare,
  Palette,
  Plane,
  Receipt,
  Scale,
  Settings,
  Shield,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Truck,
  UserCheck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import type { PermissionKey } from '@/lib/accessControl';
import { PLAN_FEATURES, type PlanFeature } from '@/lib/planFeatures';

export type ModuleId =
  | 'sales'
  | 'supply'
  | 'operations'
  | 'finance'
  | 'management'
  | 'growth';

export interface NavigationScreen {
  title: string;
  href: string;
  icon: ElementType;
  description: string;
  keywords?: string;
  requiredPermission?: PermissionKey;
  requiredFeature?: PlanFeature;
  sidebar?: boolean;
  badge?: string;
  isOverview?: boolean;
}

export interface ModuleSection {
  title: string;
  description: string;
  screens: NavigationScreen[];
}

export interface ErpModule {
  id: ModuleId;
  label: string;
  shortLabel: string;
  icon: ElementType;
  description: string;
  receives: string;
  delivers: string;
  overviewHref: string;
  sections: ModuleSection[];
}

export interface NavigationGroup {
  label: string;
  icon: ElementType;
  moduleId?: ModuleId;
  items: NavigationScreen[];
}

const screen = (value: NavigationScreen): NavigationScreen => value;

export const ERP_MODULES: ErpModule[] = [
  {
    id: 'sales',
    label: 'المبيعات وCRM',
    shortLabel: 'المبيعات',
    icon: Users,
    description: 'إدارة طلب العميل من أول تواصل حتى اعتماد عرض السعر وتسليمه للحجوزات.',
    receives: 'رسالة أو استفسار جديد من العميل',
    delivers: 'طلب مؤهل وعرض سعر معتمد',
    overviewHref: '/modules/sales',
    sections: [
      {
        title: 'العملاء والمتابعة',
        description: 'ملف العميل، مرحلة البيع، المتابعات وقنوات التواصل.',
        screens: [
          screen({ title: 'نظرة CRM', href: '/crm-dashboard', icon: BarChart3, description: 'مؤشرات العملاء والمبيعات والمتابعات.', requiredPermission: 'crm_view' }),
          screen({ title: 'العملاء', href: '/customers', icon: Users, description: 'قاعدة العملاء وبيانات التواصل وتاريخ التعامل.', requiredPermission: 'customers_view', sidebar: true }),
          screen({ title: 'CRM', href: '/crm', icon: UserCheck, description: 'إدارة العملاء المحتملين والمراحل والأنشطة.', requiredPermission: 'crm_view', sidebar: true }),
          screen({ title: 'خدمة العملاء', href: '/customer-service', icon: MessageSquare, description: 'استقبال الطلبات ومتابعة الحالات وخدمة ما بعد البيع.', requiredPermission: 'customer_service_view' }),
          screen({ title: 'صندوق واتساب', href: '/whatsapp-inbox', icon: MessageSquare, description: 'محادثات العملاء المرتبطة بسجل العميل.', requiredPermission: 'whatsapp_view', requiredFeature: PLAN_FEATURES.WHATSAPP, sidebar: true }),
        ],
      },
      {
        title: 'دورة المبيعات',
        description: 'استلام الطلب وتوزيعه وتجهيز العرض حتى موافقة العميل.',
        screens: [
          screen({ title: 'استقبال الطلبات', href: '/sop/intake', icon: ClipboardList, description: 'تسجيل احتياجات العميل وتحويلها إلى طلب واضح.', requiredPermission: 'crm_view' }),
          screen({ title: 'التسليم والاستلام', href: '/sop/handovers', icon: ArrowLeftRight, description: 'تسليم الطلب بين خدمة العملاء والمبيعات والحجوزات.', requiredPermission: 'crm_view', sidebar: true }),
          screen({ title: 'خط المبيعات', href: '/sop/pipeline', icon: TrendingUp, description: 'متابعة الطلبات عبر مراحل البيع المتفق عليها.', requiredPermission: 'crm_view' }),
          screen({ title: 'عروض الأسعار', href: '/quotes', icon: FileCheck, description: 'إنشاء وإرسال ومتابعة عروض الأسعار.', requiredPermission: 'quotes_view', sidebar: true }),
        ],
      },
      {
        title: 'جودة بيانات العملاء',
        description: 'تنظيف قاعدة العملاء ومنع التكرار ونقص البيانات.',
        screens: [
          screen({ title: 'العملاء المكررون', href: '/duplicate-customers', icon: Users, description: 'اكتشاف ومراجعة سجلات العملاء المتكررة.', requiredPermission: 'customers_view' }),
          screen({ title: 'جودة البيانات', href: '/data-quality', icon: AlertTriangle, description: 'مراجعة السجلات الناقصة أو غير الصالحة.', requiredPermission: 'customers_view' }),
        ],
      },
    ],
  },
  {
    id: 'supply',
    label: 'الموردون والتسعير',
    shortLabel: 'الموردون',
    icon: Building2,
    description: 'مصدر التكلفة والتوفر والشروط التي تعتمد عليها عروض الأسعار والحجوزات.',
    receives: 'طلب خدمة أو تسعير من المبيعات',
    delivers: 'تكلفة وتوفر وشروط موثقة',
    overviewHref: '/modules/supply',
    sections: [
      {
        title: 'إدارة الموردين',
        description: 'بيانات الموردين والتعاملات والأسعار المتفق عليها.',
        screens: [
          screen({ title: 'قائمة الموردين', href: '/suppliers', icon: Building2, description: 'ملفات الموردين وبيانات التواصل والتعاقد.', requiredPermission: 'suppliers_view', sidebar: true }),
          screen({ title: 'أسعار الموردين', href: '/supplier-rates', icon: Calculator, description: 'الأسعار وفترات السريان والعملات وشروط البيع.', requiredPermission: 'suppliers_view', sidebar: true }),
          screen({ title: 'التخصيصات والحصص', href: '/supplier-allotments', icon: Hotel, description: 'إدارة الغرف أو المقاعد المتاحة والمحجوزة.', requiredPermission: 'suppliers_view', sidebar: true }),
        ],
      },
      {
        title: 'التسعير',
        description: 'طلبات التسعير الواردة من المبيعات وربطها بمصدر التكلفة.',
        screens: [
          screen({ title: 'طلبات التسعير', href: '/sop/pricing', icon: FileCheck, description: 'استلام وتسعير الطلب قبل إعادته للمبيعات.', requiredPermission: 'quotes_view', sidebar: true }),
        ],
      },
    ],
  },
  {
    id: 'operations',
    label: 'الحجوزات والتشغيل',
    shortLabel: 'التشغيل',
    icon: Briefcase,
    description: 'تحويل العرض المعتمد إلى خدمات مؤكدة ومهام ومستندات ومواعيد تشغيل.',
    receives: 'عرض سعر معتمد وبيانات المسافرين',
    delivers: 'حجز مؤكد بتكلفته ومواعيده ومستنداته',
    overviewHref: '/modules/operations',
    sections: [
      {
        title: 'قيادة التشغيل',
        description: 'المهام اليومية، الاختناقات، المواعيد والتسليمات.',
        screens: [
          screen({ title: 'مركز قيادة العمليات', href: '/operations', icon: Activity, description: 'نظرة تشغيلية على الحالات المتأخرة والمهام الحرجة.', requiredPermission: 'bookings_view', sidebar: true }),
          screen({ title: 'العمليات اليومية', href: '/daily-operations', icon: Briefcase, description: 'متابعة ما يجب تنفيذه اليوم على كل الحجوزات.', requiredPermission: 'bookings_view' }),
          screen({ title: 'قائمة المهام', href: '/operations/queue', icon: ListTodo, description: 'طابور موحد للمهام والتسليمات المطلوبة.', requiredPermission: 'bookings_view', sidebar: true }),
          screen({ title: 'تقويم السفر', href: '/travel-calendar', icon: Calendar, description: 'مواعيد السفر والوصول والمغادرة والاستحقاقات.', requiredPermission: 'bookings_view', sidebar: true }),
        ],
      },
      {
        title: 'الحجوزات',
        description: 'السجل الموحد للحجوزات مع طرق عرض حسب نوع الخدمة.',
        screens: [
          screen({ title: 'كل الحجوزات', href: '/bookings', icon: ClipboardList, description: 'الحجوزات الموحدة ومساحة عمل كل حجز.', requiredPermission: 'bookings_view', sidebar: true }),
          screen({ title: 'حجوزات الفنادق', href: '/hotel-bookings', icon: Hotel, description: 'عرض حجوزات الإقامة ومواعيد الدخول والخروج.', requiredPermission: 'bookings_view' }),
          screen({ title: 'حجوزات الطيران', href: '/flight-bookings', icon: Plane, description: 'عرض حجوزات الطيران ومواعيد الرحلات.', requiredPermission: 'bookings_view' }),
          screen({ title: 'تأجير السيارات', href: '/car-rentals', icon: Car, description: 'حجوزات السيارات وفترات الإيجار.', requiredPermission: 'bookings_view' }),
          screen({ title: 'الانتقالات', href: '/transport-bookings', icon: Truck, description: 'حجوزات النقل والاستقبال والتوصيل.', requiredPermission: 'bookings_view' }),
        ],
      },
      {
        title: 'المستندات',
        description: 'مستندات العملاء والحجوزات والفواتير والقسائم.',
        screens: [
          screen({ title: 'مركز المستندات', href: '/document-center', icon: FolderOpen, description: 'جوازات وتأشيرات وعقود ومستندات مرتبطة بالسجلات.', requiredPermission: 'documents_view', sidebar: true }),
          screen({ title: 'الفواتير والقسائم', href: '/documents', icon: FileText, description: 'إنشاء وإدارة المستندات المالية والتشغيلية.', requiredPermission: 'documents_view' }),
        ],
      },
    ],
  },
  {
    id: 'finance',
    label: 'المالية والمحاسبة',
    shortLabel: 'المالية',
    icon: Wallet,
    description: 'ربط التحصيلات ومستحقات الموردين والخزينة بالقيود والتقارير المالية.',
    receives: 'حجز مؤكد وفاتورة وتكلفة مورد',
    delivers: 'أرصدة صحيحة وصافي ربح وقوائم مالية',
    overviewHref: '/modules/finance',
    sections: [
      {
        title: 'التحكم المالي',
        description: 'ملخص الوضع المالي والمتابعة التنفيذية.',
        screens: [
          screen({ title: 'الملخص المالي التنفيذي', href: '/executive-finance', icon: TrendingUp, description: 'التحصيلات والمستحقات والسيولة وربحية الحجوزات.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE, sidebar: true }),
          screen({ title: 'لوحة المدير المالي', href: '/cfo-dashboard', icon: BarChart3, description: 'مؤشرات المحاسبة والسيولة والذمم لكل عملة.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
        ],
      },
      {
        title: 'حسابات العملاء',
        description: 'الفواتير والتحصيلات والمديونيات المرتبطة بالعميل والحجز.',
        screens: [
          screen({ title: 'الفواتير والتحصيلات', href: '/invoices', icon: Receipt, description: 'فواتير العملاء والمدفوع والمتبقي والاستحقاقات.', requiredPermission: 'invoices_view', sidebar: true }),
          screen({ title: 'كشف حساب العميل', href: '/customer-ledger', icon: BookOpen, description: 'الحركات والمديونيات والتحصيلات لكل عميل.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
        ],
      },
      {
        title: 'الموردون والمصروفات',
        description: 'المستحقات والسداد والمصروفات والموافقات المالية.',
        screens: [
          screen({ title: 'كشف حساب المورد', href: '/supplier-ledger', icon: Building2, description: 'مستحقات المورد ومدفوعاته والحركات المرتبطة.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'المصروفات والعمولات', href: '/expense-management', icon: Calculator, description: 'مصروفات الشركة والموظفين والعمولات.', requiredPermission: 'expenses_view', requiredFeature: PLAN_FEATURES.FINANCE, sidebar: true }),
          screen({ title: 'الاعتمادات المالية', href: '/finance-approvals', icon: CheckCircle2, description: 'اعتماد السداد للموردين وطلبات الاسترداد.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
        ],
      },
      {
        title: 'الخزينة والبنوك',
        description: 'حركة النقد والبنوك والتدفقات والتسويات.',
        screens: [
          screen({ title: 'الخزينة', href: '/treasury', icon: Wallet, description: 'البنوك والنقد والبطاقات والمحافظ وبوابات الدفع.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE, sidebar: true }),
          screen({ title: 'الحسابات البنكية', href: '/bank-accounts', icon: CreditCard, description: 'الحسابات وحركات القبض والصرف.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'التدفقات النقدية', href: '/cash-flow', icon: TrendingUp, description: 'الوارد والصادر وصافي التدفق حسب العملة.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'التسوية البنكية', href: '/bank-reconciliation', icon: Landmark, description: 'مطابقة حركة البنك مع الحركات المسجلة بالنظام.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
        ],
      },
      {
        title: 'المحاسبة والقوائم',
        description: 'القيود والأستاذ والفترات والقوائم المالية الرسمية.',
        screens: [
          screen({ title: 'دليل الحسابات', href: '/chart-of-accounts', icon: BookOpen, description: 'هيكل الحسابات المحاسبي للمؤسسة.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'القيود اليومية', href: '/journal-entries', icon: Receipt, description: 'القيود المرحلة آليًا والقيود اليدوية المعتمدة.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'الأستاذ العام', href: '/general-ledger', icon: FileText, description: 'حركات وأرصدة الحسابات حسب الفترة والعملة.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'مراكز التكلفة', href: '/cost-centers', icon: GitBranch, description: 'توزيع الإيرادات والمصروفات على مراكز التكلفة.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'الفترات المحاسبية', href: '/accounting-periods', icon: Calendar, description: 'فتح وإغلاق الفترات ومنع الترحيل الخاطئ.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'ميزان المراجعة', href: '/trial-balance', icon: Scale, description: 'مراجعة توازن الأرصدة المدينة والدائنة.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'قائمة الدخل', href: '/income-statement', icon: TrendingUp, description: 'الإيرادات والمصروفات وصافي الربح.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'الميزانية العمومية', href: '/balance-sheet', icon: Landmark, description: 'الأصول والخصوم وحقوق الملكية.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'التقارير المحاسبية', href: '/accounting-reports', icon: BarChart3, description: 'مركز القوائم والتقارير المحاسبية.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE, sidebar: true }),
          screen({ title: 'التحقق المالي', href: '/financial-validation', icon: ShieldCheck, description: 'فحوص توازن القيود واتساق البيانات المالية.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'الاسترداد التاريخي', href: '/finance/historical-recovery', icon: History, description: 'مراجعة وترحيل البيانات المالية التاريخية.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
        ],
      },
    ],
  },
  {
    id: 'management',
    label: 'الإدارة والرقابة',
    shortLabel: 'الإدارة',
    icon: ShieldCheck,
    description: 'متابعة أداء الشركة والفريق والصلاحيات والالتزام من مكان واحد.',
    receives: 'بيانات المبيعات والتشغيل والمالية',
    delivers: 'قرارات واعتمادات وتنبيهات للإدارات',
    overviewHref: '/modules/management',
    sections: [
      {
        title: 'الأداء والتقارير',
        description: 'مؤشرات الإدارة والربحية وجودة التنفيذ.',
        screens: [
          screen({ title: 'التقارير', href: '/reports', icon: BarChart3, description: 'تقارير المبيعات والعملاء والحجوزات.', requiredPermission: 'reports_view', sidebar: true }),
          screen({ title: 'صحة الأعمال', href: '/reports/business-health', icon: Activity, description: 'تنبيهات تشغيلية ومؤشرات سلامة سير العمل.', requiredPermission: 'reports_view', requiredFeature: PLAN_FEATURES.ADVANCED_REPORTS, sidebar: true }),
          screen({ title: 'تحليل الأرباح', href: '/profit-analytics', icon: TrendingUp, description: 'الربحية حسب الحجز والخدمة والفترة.', requiredPermission: 'reports_advanced', requiredFeature: PLAN_FEATURES.ADVANCED_REPORTS }),
          screen({ title: 'زمن دورة العميل', href: '/reports/lead-cycle-time', icon: History, description: 'الوقت بين استقبال الطلب والحجز أو الإغلاق.', requiredPermission: 'reports_view', requiredFeature: PLAN_FEATURES.ADVANCED_REPORTS }),
          screen({ title: 'الالتزام التشغيلي', href: '/sop/compliance', icon: CheckCircle2, description: 'الالتزام بمراحل العمل ومواعيد التسليم.', requiredPermission: 'reports_view', requiredFeature: PLAN_FEATURES.ADVANCED_REPORTS }),
          screen({ title: 'مؤشرات السفر', href: '/travel-kpis', icon: TrendingUp, description: 'مؤشرات الحجوزات والخدمات والسفر.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.FINANCE }),
          screen({ title: 'مركز التصدير', href: '/export-center', icon: Download, description: 'تصدير البيانات والتقارير المسموح بها.', requiredPermission: 'reports_view', requiredFeature: PLAN_FEATURES.ADVANCED_REPORTS }),
        ],
      },
      {
        title: 'الفريق والمؤسسة',
        description: 'المستخدمون والأدوار والفروع والأقسام وسياسات العمل.',
        screens: [
          screen({ title: 'مركز المؤسسة', href: '/organization', icon: Building2, description: 'نقطة الدخول لإعدادات المؤسسة ومكوناتها.', requiredPermission: 'team_view', sidebar: true }),
          screen({ title: 'فريق العمل', href: '/team', icon: Users, description: 'المستخدمون والدعوات والأدوار وحالة العضوية.', requiredPermission: 'team_view', sidebar: true }),
          screen({ title: 'الفروع', href: '/organization/branches', icon: Building2, description: 'فروع المؤسسة ونطاق كل فرع.', requiredPermission: 'admin_settings', requiredFeature: PLAN_FEATURES.MULTI_BRANCH }),
          screen({ title: 'الأقسام', href: '/organization/departments', icon: GitBranch, description: 'الأقسام والهيكل التنظيمي.', requiredPermission: 'admin_settings', requiredFeature: PLAN_FEATURES.MULTI_BRANCH }),
          screen({ title: 'سياسات الفريق وSOP', href: '/organization/sop-team', icon: ClipboardList, description: 'توزيع الأقسام وسياسات التسليم والتشغيل.', requiredPermission: 'admin_settings', requiredFeature: PLAN_FEATURES.MULTI_BRANCH }),
        ],
      },
      {
        title: 'الحوكمة والإعدادات',
        description: 'الأمان والمراجعة والهوية وإعدادات النظام.',
        screens: [
          screen({ title: 'الإعدادات العامة', href: '/admin-settings', icon: Settings, description: 'بيانات المؤسسة والهوية والإعدادات الأساسية.', requiredPermission: 'admin_settings', sidebar: true }),
          screen({ title: 'سجل التدقيق', href: '/audit-log', icon: Shield, description: 'سجل العمليات الحساسة ومن نفذها ومتى.', requiredPermission: 'audit_view', requiredFeature: PLAN_FEATURES.AUDIT_LOG, sidebar: true }),
          screen({ title: 'مركز الأمان', href: '/organization/security', icon: Lock, description: 'سياسات الدخول والحماية وإعدادات الأمان.', requiredPermission: 'admin_settings', requiredFeature: PLAN_FEATURES.ENTERPRISE_CONTROLS }),
          screen({ title: 'الهوية المخصصة', href: '/organization/white-label', icon: Palette, description: 'شعار وألوان المؤسسة على النظام والمستندات.', requiredPermission: 'admin_settings', requiredFeature: PLAN_FEATURES.WHITE_LABEL }),
          screen({ title: 'مركز القوالب', href: '/templates', icon: FileText, description: 'قوالب واتساب والبريد والعروض والفواتير والقسائم.', requiredPermission: 'admin_settings' }),
          screen({ title: 'الاستيراد والتصدير', href: '/admin-import-export', icon: Download, description: 'نقل البيانات بطريقة منظمة ومراجعة نتائج الاستيراد.', requiredPermission: 'admin_settings' }),
          screen({ title: 'الميزات المتقدمة', href: '/organization/feature-flags', icon: Zap, description: 'إدارة الميزات المتاحة داخل المؤسسة.', requiredPermission: 'admin_settings', requiredFeature: PLAN_FEATURES.ENTERPRISE_CONTROLS }),
          screen({ title: 'المراقبة', href: '/monitoring', icon: Activity, description: 'مراقبة الأخطاء والأداء والطلبات.', requiredPermission: 'admin_settings', requiredFeature: PLAN_FEATURES.ENTERPRISE_CONTROLS }),
          screen({ title: 'وضع العرض', href: '/organization/demo-mode', icon: Sparkles, description: 'إدارة بيانات العرض التوضيحي بأمان.', requiredPermission: 'admin_settings' }),
        ],
      },
    ],
  },
  {
    id: 'growth',
    label: 'النمو والأتمتة',
    shortLabel: 'النمو',
    icon: Zap,
    description: 'تشغيل المتابعات والحملات والمساعد الذكي وربطها بدورة العميل.',
    receives: 'شرائح العملاء وحالات الحجوزات والأحداث',
    delivers: 'متابعات آلية وفرص بيع جديدة إلى CRM',
    overviewHref: '/modules/growth',
    sections: [
      {
        title: 'التسويق والأتمتة',
        description: 'حملات مترابطة مع العميل والحجز بدل أدوات منفصلة.',
        screens: [
          screen({ title: 'رحلات التسويق', href: '/marketing/journeys', icon: Megaphone, description: 'تصميم رحلة تواصل مبنية على بيانات العميل.', requiredPermission: 'marketing_view', requiredFeature: PLAN_FEATURES.MARKETING, sidebar: true }),
          screen({ title: 'قواعد الأتمتة', href: '/automation', icon: Zap, description: 'تشغيل إجراء أو تنبيه عند حدوث شرط محدد.', requiredPermission: 'automation_view', requiredFeature: PLAN_FEATURES.AUTOMATION, sidebar: true }),
        ],
      },
      {
        title: 'قنوات وأدوات النمو',
        description: 'إعدادات التواصل والمساعد الذكي وتجربة العلامة.',
        screens: [
          screen({ title: 'إدارة واتساب', href: '/whatsapp-admin', icon: MessageSquare, description: 'إعداد الرقم والقوالب وحالة التكامل.', requiredPermission: 'whatsapp_admin', requiredFeature: PLAN_FEATURES.WHATSAPP, sidebar: true }),
          screen({ title: 'المساعد الذكي', href: '/ai-assistant', icon: Sparkles, description: 'مساعد تحليلي داخل بيانات المؤسسة المسموح بها.', requiredPermission: 'financial_view', requiredFeature: PLAN_FEATURES.AI_ASSISTANT, sidebar: true, badge: 'AI' }),
          screen({ title: 'تخصيص واجهة الموقع', href: '/site-customization', icon: Palette, description: 'إدارة الشكل والمحتوى العام لواجهة المؤسسة.', requiredPermission: 'admin_settings', requiredFeature: PLAN_FEATURES.WHITE_LABEL }),
          screen({ title: 'إدارة صفحات الموقع', href: '/admin/cms', icon: FileText, description: 'صفحات ومكونات المحتوى العام للموقع.', requiredPermission: 'admin_settings', requiredFeature: PLAN_FEATURES.WHITE_LABEL }),
        ],
      },
    ],
  },
];

export const HOME_SCREENS: NavigationScreen[] = [
  screen({
    title: 'لوحة التحكم',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'ملخص اليوم وأهم مؤشرات المؤسسة.',
    sidebar: true,
    keywords: 'dashboard home الرئيسية',
  }),
];

export const SYSTEM_SCREENS: NavigationScreen[] = [
  screen({ title: 'إدارة الاشتراك', href: '/subscription', icon: CreditCard, description: 'الخطة الحالية والفوترة والترقية.', sidebar: true }),
];

export const QUICK_ACTIONS: NavigationScreen[] = [
  screen({ title: 'عميل جديد', href: '/new-customer', icon: Users, description: 'إضافة عميل أو Lead جديد.', requiredPermission: 'customers_create', keywords: 'new customer add lead' }),
  screen({ title: 'عرض سعر جديد', href: '/quotes/new', icon: FileCheck, description: 'بدء عرض سعر مرتبط بعميل.', requiredPermission: 'quotes_create', keywords: 'new quote proposal' }),
  screen({ title: 'حجز جديد', href: '/bookings/new', icon: ClipboardList, description: 'إنشاء حجز موحد جديد.', requiredPermission: 'bookings_create', keywords: 'new booking reservation' }),
  screen({ title: 'فاتورة جديدة', href: '/invoices/new', icon: Receipt, description: 'إنشاء فاتورة عميل.', requiredPermission: 'invoices_create', keywords: 'new invoice' }),
];

const moduleSidebarItems = (module: ErpModule): NavigationScreen[] => [
  {
    title: 'نظرة عامة',
    href: module.overviewHref,
    icon: module.icon,
    description: module.description,
    isOverview: true,
  },
  ...module.sections.flatMap((section) => section.screens.filter((item) => item.sidebar)),
];

export const NAVIGATION_GROUPS: NavigationGroup[] = [
  { label: 'الرئيسية', icon: LayoutDashboard, items: HOME_SCREENS },
  ...ERP_MODULES.map((module) => ({
    label: module.label,
    icon: module.icon,
    moduleId: module.id,
    items: moduleSidebarItems(module),
  })),
  { label: 'إدارة النظام', icon: Settings, items: SYSTEM_SCREENS },
];

export const getModuleScreens = (module: ErpModule): NavigationScreen[] =>
  module.sections.flatMap((section) => section.screens);

export const getAllModuleScreens = (): NavigationScreen[] =>
  ERP_MODULES.flatMap(getModuleScreens);

export const findModuleById = (id: string | undefined): ErpModule | undefined =>
  ERP_MODULES.find((module) => module.id === id);

export const pathMatchesScreen = (pathname: string, href: string): boolean =>
  pathname === href || pathname.startsWith(`${href}/`);

export const findModuleByPath = (pathname: string): ErpModule | undefined =>
  ERP_MODULES.find((module) =>
    pathname === module.overviewHref
    || getModuleScreens(module)
      .slice()
      .sort((a, b) => b.href.length - a.href.length)
      .some((item) => pathMatchesScreen(pathname, item.href)),
  );
