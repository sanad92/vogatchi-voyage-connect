import type { ModuleId } from './moduleNavigation';
import type { PermissionKey } from '@/lib/accessControl';

export type MetricFormat = 'number' | 'currency' | 'percent' | 'hours';

export interface MetricDef {
  /** مفتاح الرقم داخل نتيجة get_module_pulse */
  key: string;
  label: string;
  format?: MetricFormat;
  /** اتجاه الأفضل: صعود أم هبوط */
  goodDirection?: 'up' | 'down';
  href?: string;
  requiredPermission?: PermissionKey;
  /** يُحسب من مؤشرات أخرى بدل قراءته مباشرة */
  derive?: (v: Record<string, number>) => number;
}

export interface FlowDef {
  inLabel: string;
  inKey: string;
  outLabel: string;
  outKey: string;
}

export interface ModulePulseDef {
  kpis: MetricDef[];
  flow: FlowDef;
}

export interface AlertDef {
  key: string;
  module: ModuleId;
  label: string;
  hint: string;
  href: string;
  requiredPermission?: PermissionKey;
}

const num = (key: string, label: string, extra: Partial<MetricDef> = {}): MetricDef => ({
  key,
  label,
  format: 'number',
  goodDirection: 'up',
  ...extra,
});

export const MODULE_PULSE: Record<ModuleId, ModulePulseDef> = {
  sales: {
    kpis: [
      num('leads_new', 'طلبات جديدة', { href: '/sop/pipeline', requiredPermission: 'crm_view' }),
      num('leads_qualifying', 'تحت التأهيل', { href: '/sop/pipeline', requiredPermission: 'crm_view' }),
      num('leads_qualified', 'مؤهلة', { href: '/sop/pipeline', requiredPermission: 'crm_view' }),
      num('quotes_sent', 'عروض مرسلة', { href: '/quotes', requiredPermission: 'quotes_view' }),
      num('quotes_accepted', 'عروض مقبولة', { href: '/quotes', requiredPermission: 'quotes_view' }),
      {
        key: 'conversion_pct',
        label: 'نسبة التحويل',
        format: 'percent',
        goodDirection: 'up',
        derive: (v) => (v.leads_new > 0 ? Math.round((v.leads_won / v.leads_new) * 1000) / 10 : 0),
      },
    ],
    flow: { inLabel: 'طلبات واردة', inKey: 'leads_new', outLabel: 'عروض معتمدة للتشغيل', outKey: 'quotes_accepted' },
  },
  supply: {
    kpis: [
      num('pricing_open', 'طلبات تسعير مفتوحة', { goodDirection: 'down', href: '/sop/pricing', requiredPermission: 'quotes_view' }),
      num('pricing_published', 'تسعيرات منشورة', { href: '/sop/pricing', requiredPermission: 'quotes_view' }),
      { key: 'pricing_avg_hours', label: 'متوسط زمن التسعير', format: 'hours', goodDirection: 'down' },
      num('pricing_options', 'عروض موردين مسجلة'),
      num('suppliers_active', 'موردون نشطون', { href: '/suppliers', requiredPermission: 'suppliers_view' }),
    ],
    flow: { inLabel: 'طلبات تسعير واردة', inKey: 'pricing_open', outLabel: 'تسعيرات مسلّمة للمبيعات', outKey: 'pricing_published' },
  },
  operations: {
    kpis: [
      num('bookings_new', 'حجوزات جديدة', { href: '/bookings', requiredPermission: 'bookings_view' }),
      num('bookings_confirmed', 'حجوزات مؤكدة', { href: '/bookings', requiredPermission: 'bookings_view' }),
      num('travel_next_7d', 'سفر خلال 7 أيام', { href: '/travel-calendar', requiredPermission: 'bookings_view' }),
      num('tasks_overdue', 'مهام متأخرة', { goodDirection: 'down', href: '/operations/queue', requiredPermission: 'bookings_view' }),
      num('bookings_no_voucher', 'حجوزات بدون فاوتشر', { goodDirection: 'down', href: '/bookings', requiredPermission: 'bookings_view' }),
    ],
    flow: { inLabel: 'حجوزات مستلمة', inKey: 'bookings_new', outLabel: 'حجوزات مؤكدة للمالية', outKey: 'bookings_confirmed' },
  },
  finance: {
    kpis: [
      { key: 'revenue', label: 'الإيراد', format: 'currency', goodDirection: 'up', href: '/executive-finance', requiredPermission: 'financial_view' },
      { key: 'cost', label: 'التكلفة', format: 'currency', goodDirection: 'down', href: '/executive-finance', requiredPermission: 'financial_view' },
      { key: 'profit', label: 'صافي الربح', format: 'currency', goodDirection: 'up', href: '/profit-analytics', requiredPermission: 'financial_view' },
      {
        key: 'margin_pct',
        label: 'هامش الربح',
        format: 'percent',
        goodDirection: 'up',
        derive: (v) => (v.revenue > 0 ? Math.round((v.profit / v.revenue) * 1000) / 10 : 0),
      },
      { key: 'collected', label: 'محصّل', format: 'currency', goodDirection: 'up', href: '/invoices', requiredPermission: 'invoices_view' },
      { key: 'receivables', label: 'مستحق على العملاء', format: 'currency', goodDirection: 'down', href: '/customer-ledger', requiredPermission: 'financial_view' },
      { key: 'payables', label: 'مستحق للموردين', format: 'currency', goodDirection: 'down', href: '/supplier-ledger', requiredPermission: 'financial_view' },
      num('invoices_overdue', 'فواتير متأخرة', { goodDirection: 'down', href: '/invoices', requiredPermission: 'invoices_view' }),
    ],
    flow: { inLabel: 'حجوزات مؤكدة واردة', inKey: 'bookings_confirmed', outLabel: 'قيود مرحّلة', outKey: 'journal_entries' },
  },
  management: {
    kpis: [
      { key: 'cycle_avg_hours', label: 'متوسط زمن الدورة', format: 'hours', goodDirection: 'down', href: '/reports/lead-cycle-time', requiredPermission: 'reports_view' },
      num('leads_stalled', 'طلبات متوقفة', { goodDirection: 'down', href: '/sop/pipeline', requiredPermission: 'crm_view' }),
      num('stage_events', 'انتقالات مراحل', { href: '/reports/lead-cycle-time', requiredPermission: 'reports_view' }),
      num('journal_entries', 'قيود محاسبية', { href: '/journal-entries', requiredPermission: 'financial_view' }),
      num('leads_won', 'صفقات مكسوبة', { href: '/reports', requiredPermission: 'reports_view' }),
    ],
    flow: { inLabel: 'أحداث مسجلة', inKey: 'stage_events', outLabel: 'صفقات مكسوبة', outKey: 'leads_won' },
  },
  growth: {
    kpis: [
      num('messages_sent', 'رسائل صادرة', { href: '/whatsapp-inbox', requiredPermission: 'whatsapp_view' }),
      num('messages_failed', 'رسائل فاشلة', { goodDirection: 'down', href: '/whatsapp-inbox', requiredPermission: 'whatsapp_view' }),
      num('messages_in', 'ردود واردة', { href: '/whatsapp-inbox', requiredPermission: 'whatsapp_view' }),
      num('campaigns_active', 'حملات نشطة'),
      num('automations_active', 'قواعد أتمتة مفعّلة'),
      num('repeat_customers', 'عملاء متكررون', { href: '/customers', requiredPermission: 'customers_view' }),
    ],
    flow: { inLabel: 'ردود واردة', inKey: 'messages_in', outLabel: 'طلبات جديدة للمبيعات', outKey: 'leads_new' },
  },
};

export const MODULE_ALERTS: AlertDef[] = [
  {
    key: 'qualified_no_pricing',
    module: 'sales',
    label: 'طلب مؤهل بدون طلب تسعير',
    hint: 'المبيعات أهّلت الطلب ولم ترسله للتسعير.',
    href: '/sop/pipeline',
    requiredPermission: 'crm_view',
  },
  {
    key: 'pricing_quoted_no_quote',
    module: 'supply',
    label: 'تسعير منشور بدون عرض سعر',
    hint: 'التسعير جاهز ولم يتحول إلى عرض سعر للعميل.',
    href: '/sop/pricing',
    requiredPermission: 'quotes_view',
  },
  {
    key: 'quote_accepted_no_booking',
    module: 'operations',
    label: 'عرض مقبول بدون حجز',
    hint: 'العميل وافق ولم يُنشأ حجز.',
    href: '/quotes',
    requiredPermission: 'quotes_view',
  },
  {
    key: 'booking_no_invoice',
    module: 'finance',
    label: 'حجز مؤكد بدون فاتورة',
    hint: 'حجوزات مؤكدة لم تُصدر لها فاتورة عميل.',
    href: '/invoices',
    requiredPermission: 'invoices_view',
  },
  {
    key: 'cost_no_payment_order',
    module: 'finance',
    label: 'تكلفة مورد بدون أمر دفع',
    hint: 'حجوزات بتكلفة مسجلة بدون أمر دفع للمورد.',
    href: '/finance-approvals',
    requiredPermission: 'financial_view',
  },
  {
    key: 'paid_invoice_no_journal',
    module: 'finance',
    label: 'فاتورة مدفوعة بدون قيد',
    hint: 'فواتير محصّلة لم تُرحّل محاسبيًا.',
    href: '/journal-entries',
    requiredPermission: 'financial_view',
  },
];
