import { Fragment, useState, type ElementType } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Check,
  CheckCircle2,
  FileCheck2,
  FileText,
  Headphones,
  Hotel,
  MessageSquareText,
  Plane,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Users,
  WalletCards,
  Workflow,
  X,
  Zap,
} from 'lucide-react';

import SafarERPLogo from '@/components/brand/VogantraLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useLanguage } from '@/contexts/LanguageContext';

type PricingPlan = Database['public']['Tables']['subscription_plans']['Row'];

interface FeatureDefinition {
  label: string;
  icon: ElementType;
  keys: string[];
  mode?: 'all' | 'any';
}

interface FeatureGroup {
  label: string;
  description: string;
  icon: ElementType;
  features: FeatureDefinition[];
}

interface PlanLimitDefinition {
  label: string;
  icon: ElementType;
  getValue: (plan: PricingPlan) => string;
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    label: 'العملاء والمبيعات',
    description: 'من أول تواصل حتى اعتماد عرض السعر',
    icon: Users,
    features: [
      { label: 'العملاء وCRM ودورة البيع', icon: Users, keys: ['basic_crm'] },
      { label: 'استقبال الطلبات وتسليمها بين الأقسام', icon: Workflow, keys: ['sop_workflow'] },
      { label: 'عروض الأسعار والمتابعة', icon: FileCheck2, keys: ['quotes'] },
    ],
  },
  {
    label: 'الموردون والمشتريات',
    description: 'التكلفة والتوفر وشروط المورد',
    icon: Hotel,
    features: [
      { label: 'ملفات الموردين والعقود', icon: Building2, keys: ['suppliers'] },
      { label: 'أسعار الموردين والتخصيصات', icon: Hotel, keys: ['suppliers'] },
    ],
  },
  {
    label: 'الحجوزات والتشغيل',
    description: 'الحجز والمهام والمستندات التشغيلية',
    icon: Plane,
    features: [
      {
        label: 'حجوزات فنادق وطيران وسيارات وانتقالات',
        icon: Plane,
        keys: ['hotel_bookings', 'flight_bookings', 'car_rentals', 'transport'],
        mode: 'all',
      },
      { label: 'المهام وSOP وتقويم التشغيل', icon: Workflow, keys: ['sop_workflow'] },
      { label: 'مركز المستندات والقسائم', icon: FileText, keys: ['documents'] },
    ],
  },
  {
    label: 'المالية والمحاسبة',
    description: 'التحصيل والمستحقات والخزينة والقيود',
    icon: WalletCards,
    features: [
      { label: 'الفواتير والتحصيلات', icon: ReceiptText, keys: ['invoices'] },
      { label: 'مستحقات الموردين والمصروفات', icon: WalletCards, keys: ['finance'] },
      { label: 'الخزينة والبنوك والتدفقات النقدية', icon: WalletCards, keys: ['finance'] },
      { label: 'المحاسبة والقوائم المالية', icon: BarChart3, keys: ['finance'] },
    ],
  },
  {
    label: 'الموظفون والعمولات',
    description: 'ملفات الموظفين واستحقاقات العمولات',
    icon: Users,
    features: [
      { label: 'عمولات الموظفين ومتابعة الاستحقاق', icon: WalletCards, keys: ['commissions'] },
    ],
  },
  {
    label: 'الإدارة والإعدادات المشتركة',
    description: 'الفريق والتقارير والصلاحيات والحوكمة',
    icon: ShieldCheck,
    features: [
      { label: 'التقارير الإدارية الأساسية', icon: BarChart3, keys: ['reports'] },
      { label: 'التحليلات والتقارير المتقدمة', icon: BarChart3, keys: ['advanced_reports'] },
      { label: 'الفروع والأقسام', icon: Building2, keys: ['multi_branch'] },
      { label: 'سجل المراجعة', icon: ShieldCheck, keys: ['audit_log'] },
      { label: 'ضوابط المؤسسات المتقدمة', icon: ShieldCheck, keys: ['enterprise_controls'] },
    ],
  },
  {
    label: 'التسويق والتواصل',
    description: 'محادثات العملاء ورحلات التسويق',
    icon: Zap,
    features: [
      { label: 'رحلات وحملات التسويق', icon: Zap, keys: ['marketing'] },
      { label: 'واتساب وصندوق المحادثات', icon: MessageSquareText, keys: ['whatsapp'] },
    ],
  },
  {
    label: 'الأتمتة والأدوات المشتركة',
    description: 'أدوات تخدم جميع الموديولات',
    icon: Zap,
    features: [
      { label: 'قواعد الأتمتة', icon: Zap, keys: ['automation'] },
      { label: 'المساعد الذكي', icon: Sparkles, keys: ['ai_assistant'] },
      { label: 'هوية مخصصة White label', icon: Sparkles, keys: ['white_label'] },
    ],
  },
];

const PLAN_CARD_FEATURES: FeatureDefinition[] = [
  { label: 'العملاء وCRM', icon: Users, keys: ['basic_crm'] },
  { label: 'SOP وتسليم المهام', icon: Workflow, keys: ['sop_workflow'] },
  { label: 'عروض الأسعار', icon: FileCheck2, keys: ['quotes'] },
  {
    label: 'كل أنواع الحجوزات',
    icon: Plane,
    keys: ['hotel_bookings', 'flight_bookings', 'car_rentals', 'transport'],
    mode: 'all',
  },
  { label: 'الموردون والمشتريات', icon: Hotel, keys: ['suppliers'] },
  { label: 'الفواتير والمستندات', icon: ReceiptText, keys: ['invoices', 'documents'], mode: 'all' },
  { label: 'التقارير الأساسية', icon: BarChart3, keys: ['reports'] },
  { label: 'المالية والمحاسبة', icon: WalletCards, keys: ['finance'] },
  { label: 'واتساب والأتمتة والتسويق', icon: Zap, keys: ['whatsapp', 'automation', 'marketing'], mode: 'all' },
  { label: 'التقارير المتقدمة والمساعد الذكي', icon: Sparkles, keys: ['advanced_reports', 'ai_assistant'], mode: 'all' },
  { label: 'الفروع والعمولات وسجل المراجعة', icon: ShieldCheck, keys: ['multi_branch', 'commissions', 'audit_log'], mode: 'all' },
  { label: 'White label وضوابط المؤسسات', icon: Building2, keys: ['white_label', 'enterprise_controls'], mode: 'all' },
];

const PLAN_META: Record<string, { description: string; audience: string }> = {
  Basic: {
    description: 'كل ما يحتاجه فريق صغير لتوحيد المبيعات والحجوزات بدل الملفات المتفرقة.',
    audience: 'للشركات الصغيرة وفرق التشغيل',
  },
  Pro: {
    description: 'تشغيل كامل مع المالية، الأتمتة، واتساب والتقارير الإدارية المتقدمة.',
    audience: 'للشركات النامية وفرق متعددة الأقسام',
  },
  Enterprise: {
    description: 'تحكم مؤسسي، فروع وهوية مخصصة لعمليات أكبر وأكثر تعقيدًا.',
    audience: 'للمجموعات والشركات متعددة الفروع',
  },
};

const RECOMMENDED_PLAN = 'Pro';
const phone = '+201103442886';
const rowHeading = 'sticky start-0 z-10 bg-card px-2 py-3 text-start font-medium sm:px-5 sm:py-4';

const getFeatures = (plan: PricingPlan): string[] =>
  Array.isArray(plan.features) ? plan.features.filter((feature): feature is string => typeof feature === 'string') : [];

const hasFeature = (planFeatures: string[], feature: FeatureDefinition) => {
  if (planFeatures.includes('all_features')) return true;
  const matches = feature.keys.map((key) => planFeatures.includes(key));
  return feature.mode === 'any' ? matches.some(Boolean) : matches.every(Boolean);
};

const formatStorage = (storageMb: number) => {
  if (storageMb >= 1024) return `${Math.round(storageMb / 1024)} GB`;
  return `${storageMb} MB`;
};

const PLAN_LIMITS: PlanLimitDefinition[] = [
  {
    label: 'المستخدمون المشمولون',
    icon: Users,
    getValue: (plan) => `${Number(plan.max_users).toLocaleString('ar-EG')} مستخدم`,
  },
  {
    label: 'الحجوزات الشهرية',
    icon: Plane,
    getValue: (plan) => `${Number(plan.max_bookings_per_month).toLocaleString('ar-EG')} حجز / شهر`,
  },
  {
    label: 'المساحة التخزينية',
    icon: FileText,
    getValue: (plan) => formatStorage(Number(plan.max_storage_mb)),
  },
];

const PRIORITY_SUPPORT: FeatureDefinition = {
  label: 'دعم بأولوية',
  icon: Headphones,
  keys: ['priority_support'],
};

const PricingPage = () => {
  const [isYearly, setIsYearly] = useState(false);
  const { dir, language } = useLanguage();
  const money = new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'ar-EG', {
    style: 'currency', currency: 'EGP', maximumFractionDigits: 2, minimumFractionDigits: 0,
  }).format;
  const { user } = useOptimizedAuth();

  const { data: plans = [], isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['pricing-plans'],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .gt('price_monthly', 0)
        .order('price_monthly', { ascending: true })
        .abortSignal(signal);
      if (error) throw error;
      return data ?? [];
    },
  });

  const yearlyDiscount = (plan: PricingPlan) => {
    const monthlyTotal = Number(plan.price_monthly) * 12;
    const yearly = Number(plan.price_yearly);
    if (!monthlyTotal || !yearly) return 0;
    return Math.round(((monthlyTotal - yearly) / monthlyTotal) * 100);
  };

  const canCompare = !isError && plans.length > 0;
  const showDiscount = canCompare && plans.some((plan) => yearlyDiscount(plan) > 0);

  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <header className="sticky top-0 z-50 border-b border-border/80 bg-card/90 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-4 py-2 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="SafarERP">
            <SafarERPLogo size="sm" className="[&_img]:max-w-[115px] sm:[&_img]:max-w-none" />
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="font-bold text-foreground"><Link to="/login">تسجيل الدخول</Link></Button>
            <Button asChild size="sm" className="rounded-lg font-bold"><Link to="/signup">ابدأ التجربة</Link></Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-border bg-brand-navy py-20 text-brand-ivory sm:py-24">
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <Badge className="border border-border/30 bg-primary/15 px-4 py-1.5 text-brand-gold hover:bg-primary/15">
              <Sparkles className="ml-1.5 h-4 w-4" />
              تجربة مجانية لمدة 14 يومًا
            </Badge>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              خطط وأسعار SafarERP
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-brand-ivory/80 sm:text-lg">
              اختَر الباقة حسب عدد المستخدمين والحجوزات والميزات اللي تحتاجها شركتك. الأسعار بالجنيه المصري.
            </p>
            <div className="mt-7 flex justify-center">
              <div role="group" aria-label="دورة الفوترة" className="inline-flex items-center gap-1 rounded-xl border border-brand-ivory/20 bg-card/10 p-1">
                {([{ yearly: false, label: 'شهري' }, { yearly: true, label: 'سنوي' }]).map(({ yearly, label }) => (
                  <button key={label} type="button" aria-pressed={isYearly === yearly} onClick={() => setIsYearly(yearly)}
                    className={`min-h-11 rounded-lg px-5 text-sm font-bold transition-colors ${isYearly === yearly ? 'bg-card text-foreground' : 'text-brand-ivory hover:bg-card/15'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {showDiscount && <p className="mt-3 text-xs text-brand-ivory/80">التوفير السنوي موضّح تحت سعر كل باقة.</p>}
          </div>
        </section>

        <section aria-label="خطط الاشتراك" className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          {isLoading ? (
            <p role="status" className="py-12 text-center text-muted-foreground">جارٍ تحميل الخطط...</p>
          ) : isError || !plans.length ? (
            <div role={isError ? 'alert' : 'status'} className="mx-auto max-w-lg rounded-xl border border-border bg-card p-6 text-center">
              <h2 className="font-bold">{isError ? 'تعذّر تحميل الخطط' : 'الخطط غير متاحة حاليًا'}</h2>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                <Button type="button" variant="outline" disabled={isFetching} onClick={() => refetch()}>
                  <RefreshCw aria-hidden="true" /> إعادة المحاولة
                </Button>
                <Button variant="ghost" asChild><a href={`tel:${phone}`}>تواصل معنا</a></Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
              {plans.map((plan) => {
                const features = getFeatures(plan);
                const included = PLAN_CARD_FEATURES.filter((feature) => hasFeature(features, feature));
                const recommended = plan.name === RECOMMENDED_PLAN;
                const monthly = Number(plan.price_monthly);
                const yearly = Number(plan.price_yearly);
                const price = isYearly ? yearly : monthly;
                const available = Number.isFinite(price) && price > 0;
                const discount = yearlyDiscount(plan);
                const checkoutUrl = `/payment?plan=${encodeURIComponent(plan.id)}&billing=${isYearly ? 'yearly' : 'monthly'}`;
                const baseFeatures = getFeatures(plans[0]);
                const highlights = included.filter((feature) => plan.id === plans[0].id || !hasFeature(baseFeatures, feature));
                const meta = PLAN_META[plan.name] ?? {
                  description: 'خطة مرنة لتشغيل شركتك على منصة واحدة.',
                  audience: 'لفرق شركات السياحة',
                };

                return (
                  <article
                    key={plan.id}
                    className={`relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm ${recommended ? 'border-brand-gold/70' : 'border-border'}`}
                  >
                    <div className={`min-h-8 px-6 py-2 text-center text-xs font-bold ${recommended ? 'bg-primary text-primary-foreground' : 'hidden lg:block'}`}>
                      {recommended && 'مناسبة للفرق النامية'}
                    </div>
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground">{meta.audience}</p>
                        <h2 className="mt-2 text-3xl font-black text-foreground">{plan.name_ar || plan.name}</h2>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground lg:min-h-[3rem]">{meta.description}</p>
                      </div>

                      <div className="mt-5 rounded-xl bg-muted p-4 lg:min-h-[7.5rem]">
                        {available ? (
                          <>
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <bdi className="text-3xl font-black tabular-nums sm:text-[2rem]">{money(price)}</bdi>
                              <span className="text-sm font-semibold text-muted-foreground">{isYearly ? 'سنوياً' : 'شهرياً'}</span>
                            </div>
                            {isYearly && (
                              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                                <span className="text-muted-foreground">ما يعادل <bdi>{money(yearly / 12)}</bdi> شهرياً</span>
                                {discount > 0 && <Badge className="bg-success/10 text-success hover:bg-success/10">وفّر {discount}%</Badge>}
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="py-2 text-sm font-semibold">الدفع السنوي غير متاح لهذه الباقة.</p>
                        )}
                      </div>

                      <div className="mt-5">
                        {available || !user ? (
                          <Button asChild size="lg" className="w-full rounded-xl font-bold"
                            variant={recommended ? 'default' : 'outline'}>
                            <Link to={user ? checkoutUrl : '/signup'}>
                              {user ? 'اشترك الآن' : 'ابدأ تجربة 14 يومًا'}
                              <ArrowLeft className="ms-2 h-4 w-4" aria-hidden="true" />
                            </Link>
                          </Button>
                        ) : (
                          <Button type="button" size="lg" variant="outline" className="w-full rounded-xl" onClick={() => setIsYearly(false)}>عرض السعر الشهري</Button>
                        )}
                        {!user && <p className="mt-2 text-center text-xs text-muted-foreground">بدون بطاقة للتجربة</p>}
                      </div>

                      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                        <div className="min-w-0 rounded-lg border border-border px-1 py-2 sm:px-2">
                          <div className="text-lg font-black text-foreground">{plan.max_users}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">مستخدم</div>
                        </div>
                        <div className="min-w-0 rounded-lg border border-border px-1 py-2 sm:px-2">
                          <div className="text-lg font-black text-foreground">{Number(plan.max_bookings_per_month).toLocaleString('ar-EG')}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">حجز/شهر</div>
                        </div>
                        <div className="min-w-0 rounded-lg border border-border px-1 py-2 sm:px-2">
                          <div className="text-lg font-black text-foreground">{formatStorage(plan.max_storage_mb)}</div>
                          <div className="mt-1 text-[11px] text-muted-foreground">تخزين</div>
                        </div>
                      </div>

                      <div className="mt-7 flex-1">
                        <p className="text-sm font-black text-foreground">أهم ما يشمله:</p>
                        <ul className="mt-4 space-y-3">
                          {(highlights.length ? highlights : included).slice(0, 6).map((feature) => (
                            <li key={feature.label} className="flex items-start gap-2.5 text-sm leading-6 text-foreground">
                              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                              {feature.label}
                            </li>
                          ))}
                        </ul>
                        <a href="#compare-plans" className="mt-4 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline">قارن كل المميزات</a>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {canCompare && <section id="compare-plans" className="scroll-mt-24 border-y border-border bg-card py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 id="plan-comparison-title" className="text-3xl font-black text-foreground sm:text-4xl">قارن الباقات</h2>
              <p className="mt-4 text-sm leading-7 text-muted-foreground">المميزات مجمعة حسب دورة العمل داخل شركة السياحة، من المبيعات حتى الإدارة والربحية.</p>
            </div>
            <div role="region" aria-labelledby="plan-comparison-title" tabIndex={0} className="mt-7 overflow-x-auto rounded-xl border border-border">
              <table className="w-full table-fixed border-collapse text-xs sm:text-sm"
                style={{ minWidth: plans.length > 3 ? 144 + 64 * plans.length : undefined }}>
                <colgroup>
                  <col className="w-[43%] sm:w-[40%]" />
                  {plans.map((plan) => <col key={plan.id} />)}
                </colgroup>
                <thead className="bg-muted">
                  <tr>
                    <th scope="col" className="sticky start-0 z-20 bg-muted px-2 py-3 text-start font-bold sm:px-5">الشاشة أو الوظيفة</th>
                    {plans.map((plan) => (
                      <th key={plan.id} scope="col" className={`break-words px-1 py-3 text-center font-bold sm:px-4 sm:py-4 ${plan.name === RECOMMENDED_PLAN ? 'text-brand-gold' : 'text-foreground'}`}>
                        {plan.name_ar || plan.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-border">
                    <th scope="row" className={rowHeading}>{isYearly ? 'السعر السنوي' : 'السعر الشهري'}</th>
                    {plans.map((plan) => {
                      const price = Number(isYearly ? plan.price_yearly : plan.price_monthly);
                      return (
                        <td key={plan.id} className="break-words px-1 py-3 text-center font-bold sm:px-4 sm:py-4">
                          {price > 0 ? <bdi>{money(price)}</bdi> : 'غير متاح'}
                        </td>
                      );
                    })}
                  </tr>
                  {FEATURE_GROUPS.map((group) => {
                    const GroupIcon = group.icon;
                    return (
                      <Fragment key={group.label}>
                        <tr className="border-t border-border bg-muted/80">
                          <th colSpan={plans.length + 1} className="px-2 py-3 text-start sm:px-5 sm:py-4">
                            <div className="flex items-center gap-3">
                              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                <GroupIcon className="h-4 w-4" />
                              </span>
                              <div>
                                <div className="font-black text-foreground">{group.label}</div>
                                <div className="mt-0.5 text-xs font-medium text-muted-foreground">{group.description}</div>
                              </div>
                            </div>
                          </th>
                        </tr>
                        {group.features.map((feature) => {
                          const Icon = feature.icon;
                          return (
                            <tr key={feature.label} className="border-t border-border bg-card">
                              <th scope="row" className={rowHeading}>
                                <div className="flex items-center gap-2">
                                  <Icon className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
                                  {feature.label}
                                </div>
                              </th>
                              {plans.map((plan) => {
                                const included = hasFeature(getFeatures(plan), feature);
                                return (
                                  <td key={plan.id} className="break-words px-1 py-3 text-center sm:px-4 sm:py-4">
                                    {included ? (
                                      <CheckCircle2 role="img" aria-label="مشمول" className="mx-auto h-4 w-4 text-success sm:h-5 sm:w-5" />
                                    ) : (
                                      <X role="img" aria-label="غير مشمول" className="mx-auto h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                  <tr className="border-t border-border bg-muted/80">
                    <th colSpan={plans.length + 1} className="px-2 py-3 text-start sm:px-5 sm:py-4">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          <Users className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="font-black text-foreground">حدود الخطة والدعم</div>
                          <div className="mt-0.5 text-xs font-medium text-muted-foreground">أرقام واضحة لطاقتك التشغيلية داخل النظام</div>
                        </div>
                      </div>
                    </th>
                  </tr>
                  {PLAN_LIMITS.map((limit) => {
                    const Icon = limit.icon;
                    return (
                      <tr key={limit.label} className="border-t border-border bg-card">
                        <th scope="row" className={rowHeading}>
                          <div className="flex items-center gap-2">
                            <Icon className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
                            {limit.label}
                          </div>
                        </th>
                        {plans.map((plan) => (
                          <td key={plan.id} className="break-words px-1 py-3 text-center sm:px-4 sm:py-4 font-bold text-foreground">
                            {limit.getValue(plan)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  <tr className="border-t border-border bg-card">
                    <th scope="row" className={rowHeading}>
                      <div className="flex items-center gap-2">
                        <Headphones className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
                        {PRIORITY_SUPPORT.label}
                      </div>
                    </th>
                    {plans.map((plan) => {
                      const included = hasFeature(getFeatures(plan), PRIORITY_SUPPORT);
                      return (
                        <td key={plan.id} className="break-words px-1 py-3 text-center sm:px-4 sm:py-4">
                          {included ? (
                            <CheckCircle2 role="img" aria-label="مشمول" className="mx-auto h-4 w-4 text-success sm:h-5 sm:w-5" />
                          ) : (
                            <X role="img" aria-label="غير مشمول" className="mx-auto h-4 w-4 text-muted-foreground sm:h-5 sm:w-5" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>}

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                question: 'هل توجد خطة مجانية؟',
                answer: 'تقدر تبدأ بتجربة مجانية لمدة 14 يومًا، وبعدها تختار إحدى الباقات المدفوعة للاستمرار.',
              },
              {
                question: 'هل السعر لكل مستخدم؟',
                answer: 'السعر للشركة ويشمل عدد المستخدمين الموضّح في الباقة.',
              },
              {
                question: 'ماذا لو تجاوزنا 50 مستخدمًا؟',
                answer: 'تواصل معنا لمناقشة عدد المستخدمين والفروع واحتياجات شركتك.',
              },
            ].map((item) => (
              <div key={item.question} className="rounded-lg border border-border bg-card p-6 shadow-sm">
                <FileText className="h-5 w-5 text-brand-gold" />
                <h3 className="mt-4 font-black text-foreground">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
          <a href={`tel:${phone}`} className="mx-auto mt-5 flex min-h-11 w-fit flex-wrap items-center justify-center gap-x-2 rounded-md text-sm font-semibold text-primary hover:underline">
            <Headphones className="h-4 w-4 text-brand-gold" aria-hidden="true" />
            <span>استفسارات الاشتراك</span>
            <bdi dir="ltr">{phone}</bdi>
          </a>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} SafarERP. جميع الحقوق محفوظة.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link to="/" className="hover:text-brand-gold">الرئيسية</Link>
            <Link to="/terms" className="hover:text-brand-gold">الشروط والأحكام</Link>
            <Link to="/refund-policy" className="hover:text-brand-gold">سياسة الاسترداد</Link>
            <Link to="/privacy" className="hover:text-brand-gold">الخصوصية</Link>
            <Link to="/login" className="hover:text-brand-gold">تسجيل الدخول</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
