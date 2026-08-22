import { useState, type ElementType } from 'react';
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
  Users,
  WalletCards,
  Workflow,
  X,
  Zap,
} from 'lucide-react';

import VogantraLogo from '@/components/brand/VogantraLogo';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

type PricingPlan = Database['public']['Tables']['subscription_plans']['Row'];

interface FeatureDefinition {
  label: string;
  icon: ElementType;
  keys: string[];
  mode?: 'all' | 'any';
}

const FEATURES: FeatureDefinition[] = [
  { label: 'CRM وإدارة دورة العميل', icon: Users, keys: ['basic_crm'] },
  { label: 'SOP وتسليم المهام بين الأقسام', icon: Workflow, keys: ['sop_workflow'] },
  { label: 'عروض الأسعار والتسعير', icon: FileCheck2, keys: ['quotes'] },
  {
    label: 'حجوزات فنادق وطيران وسيارات ونقل',
    icon: Plane,
    keys: ['hotel_bookings', 'flight_bookings', 'car_rentals', 'transport'],
    mode: 'all',
  },
  { label: 'الموردون والأسعار والمستندات', icon: Hotel, keys: ['suppliers', 'documents'], mode: 'all' },
  { label: 'الفواتير والتحصيل', icon: ReceiptText, keys: ['invoices'] },
  { label: 'التقارير الأساسية', icon: BarChart3, keys: ['reports'] },
  { label: 'المالية والمحاسبة والتدفقات النقدية', icon: WalletCards, keys: ['finance'] },
  { label: 'تحليلات وتقارير متقدمة', icon: BarChart3, keys: ['advanced_reports'] },
  { label: 'واتساب وصندوق المحادثات', icon: MessageSquareText, keys: ['whatsapp'] },
  { label: 'الأتمتة ورحلات التسويق', icon: Zap, keys: ['automation', 'marketing'], mode: 'all' },
  { label: 'الفروع والأقسام', icon: Building2, keys: ['multi_branch'] },
  { label: 'سجل المراجعة والضوابط المتقدمة', icon: ShieldCheck, keys: ['audit_log', 'enterprise_controls'], mode: 'any' },
  { label: 'هوية مخصصة White label', icon: Sparkles, keys: ['white_label'] },
];

const PLAN_META: Record<string, { description: string; audience: string }> = {
  Basic: {
    description: 'كل ما يحتاجه فريق صغير لتوحيد المبيعات والحجوزات بدل الملفات المتفرقة.',
    audience: 'للشركات الصغيرة وفرق التشغيل حتى 5 مستخدمين',
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

const PricingPage = () => {
  const [isYearly, setIsYearly] = useState(true);
  const { user } = useOptimizedAuth();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['pricing-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .gt('price_monthly', 0)
        .order('price_monthly', { ascending: true });
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

  return (
    <div className="min-h-screen bg-[#f7f9fc] text-slate-950" dir="rtl">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-3" aria-label="Vogantra">
            <VogantraLogo variant="mark" className="h-9 w-9" />
            <div className="text-left" dir="ltr">
              <div className="text-base font-black tracking-[0.16em] text-[#07192f]">VOGANTRA</div>
              <div className="text-[10px] font-semibold tracking-[0.11em] text-slate-500">TRAVEL OPERATING SYSTEM</div>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="font-bold">تسجيل الدخول</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="rounded-lg bg-blue-600 font-bold text-white hover:bg-blue-700">
                ابدأ التجربة
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden border-b border-slate-200 bg-[#07192f] py-20 text-white sm:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(37,99,235,0.28),transparent_32%),radial-gradient(circle_at_85%_30%,rgba(79,70,229,0.2),transparent_30%)]" />
          <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6">
            <Badge className="border border-blue-400/30 bg-blue-500/15 px-4 py-1.5 text-blue-100 hover:bg-blue-500/15">
              <Sparkles className="ml-1.5 h-4 w-4" />
              14 يوم تجربة كاملة — وليست خطة مجانية دائمة
            </Badge>
            <h1 className="mt-6 text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
              سعر واضح على قد حجم شركتك.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              كل باقة تشمل عدد مستخدمين كامل بسعر واحد؛ بدون تسعير مفاجئ لكل موظف وبدون رسوم على كل حجز.
            </p>
            <div className="mt-9 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2">
              <span className={`rounded-xl px-4 py-2 text-sm font-bold ${!isYearly ? 'bg-white text-slate-950' : 'text-slate-300'}`}>شهري</span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} aria-label="التبديل بين الدفع الشهري والسنوي" />
              <span className={`rounded-xl px-4 py-2 text-sm font-bold ${isYearly ? 'bg-white text-slate-950' : 'text-slate-300'}`}>سنوي</span>
              <Badge className="hidden bg-emerald-500 text-white hover:bg-emerald-500 sm:inline-flex">شهران هدية</Badge>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          {isLoading ? (
            <div className="py-24 text-center text-slate-500">جارٍ تحميل الخطط...</div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
              {plans.map((plan) => {
                const features = getFeatures(plan);
                const included = FEATURES.filter((feature) => hasFeature(features, feature));
                const recommended = plan.name === RECOMMENDED_PLAN;
                const monthlyEquivalent = isYearly
                  ? Math.round(Number(plan.price_yearly) / 12)
                  : Number(plan.price_monthly);
                const checkoutUrl = user
                  ? `/payment?plan=${plan.id}&billing=${isYearly ? 'yearly' : 'monthly'}`
                  : `/signup?plan=${plan.id}&billing=${isYearly ? 'yearly' : 'monthly'}`;
                const meta = PLAN_META[plan.name] ?? {
                  description: 'خطة مرنة لتشغيل شركتك على منصة واحدة.',
                  audience: 'لفرق شركات السياحة',
                };

                return (
                  <article
                    key={plan.id}
                    className={`relative flex flex-col overflow-hidden rounded-3xl border bg-white ${
                      recommended
                        ? 'border-blue-500 shadow-2xl shadow-blue-950/10 lg:-translate-y-3'
                        : 'border-slate-200 shadow-lg shadow-slate-950/5'
                    }`}
                  >
                    {recommended && (
                      <div className="bg-blue-600 py-2 text-center text-xs font-black tracking-wide text-white">
                        الأكثر اختيارًا للشركات النامية
                      </div>
                    )}
                    <div className="flex flex-1 flex-col p-6 sm:p-7">
                      <div>
                        <p className="text-sm font-bold text-blue-700">{meta.audience}</p>
                        <h2 className="mt-2 text-3xl font-black text-[#07192f]">{plan.name_ar}</h2>
                        <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-600">{meta.description}</p>
                      </div>

                      <div className="mt-7 rounded-2xl bg-slate-50 p-5">
                        <div className="flex items-end gap-2">
                          <span className="text-4xl font-black tracking-tight text-[#07192f]">
                            {monthlyEquivalent.toLocaleString('ar-EG')}
                          </span>
                          <span className="pb-1 text-sm font-semibold text-slate-500">ج.م / شهر</span>
                        </div>
                        {isYearly ? (
                          <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-500">يُدفع {Number(plan.price_yearly).toLocaleString('ar-EG')} ج.م سنويًا</span>
                            <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">وفّر {yearlyDiscount(plan)}%</Badge>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">دفع شهري مرن</p>
                        )}
                      </div>

                      <div className="mt-6 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-xl border border-slate-200 p-3">
                          <div className="text-lg font-black text-slate-950">{plan.max_users}</div>
                          <div className="mt-1 text-[11px] text-slate-500">مستخدم</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-3">
                          <div className="text-lg font-black text-slate-950">{Number(plan.max_bookings_per_month).toLocaleString('ar-EG')}</div>
                          <div className="mt-1 text-[11px] text-slate-500">حجز/شهر</div>
                        </div>
                        <div className="rounded-xl border border-slate-200 p-3">
                          <div className="text-lg font-black text-slate-950">{formatStorage(plan.max_storage_mb)}</div>
                          <div className="mt-1 text-[11px] text-slate-500">تخزين</div>
                        </div>
                      </div>

                      <div className="mt-7 flex-1">
                        <p className="text-sm font-black text-slate-950">أهم ما يشمله:</p>
                        <ul className="mt-4 space-y-3">
                          {included.slice(0, 8).map((feature) => (
                            <li key={feature.label} className="flex items-start gap-2.5 text-sm leading-6 text-slate-700">
                              <span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                                <Check className="h-3.5 w-3.5" />
                              </span>
                              {feature.label}
                            </li>
                          ))}
                        </ul>
                        {included.length > 8 && (
                          <p className="mt-3 text-xs font-bold text-blue-700">+ {included.length - 8} مميزات إضافية</p>
                        )}
                      </div>

                      <Link to={checkoutUrl} className="mt-7">
                        <Button
                          size="lg"
                          className={`w-full rounded-xl font-black ${recommended ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}`}
                          variant={recommended ? 'default' : 'outline'}
                        >
                          {user ? 'اشترك الآن' : 'ابدأ تجربة 14 يومًا'}
                          <ArrowLeft className="mr-2 h-4 w-4" />
                        </Button>
                      </Link>
                      <p className="mt-3 text-center text-xs text-slate-500">بدون بطاقة للتجربة • لا تجديد تلقائي</p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="border-y border-slate-200 bg-white py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-black text-blue-700">مقارنة الموديولات</p>
              <h2 className="mt-3 text-3xl font-black text-[#07192f] sm:text-4xl">اعرف بالضبط ما الذي تدفع مقابله.</h2>
            </div>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-right font-black text-slate-950">الموديول</th>
                    {plans.map((plan) => (
                      <th key={plan.id} className={`px-4 py-4 text-center font-black ${plan.name === RECOMMENDED_PLAN ? 'text-blue-700' : 'text-slate-950'}`}>
                        {plan.name_ar}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {FEATURES.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <tr key={feature.label} className="border-t border-slate-200">
                        <td className="px-5 py-4 text-slate-700">
                          <div className="flex items-center gap-2.5">
                            <Icon className="h-4 w-4 text-slate-500" />
                            {feature.label}
                          </div>
                        </td>
                        {plans.map((plan) => {
                          const included = hasFeature(getFeatures(plan), feature);
                          return (
                            <td key={plan.id} className="px-4 py-4 text-center">
                              {included ? (
                                <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />
                              ) : (
                                <X className="mx-auto h-5 w-5 text-slate-300" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                question: 'هل توجد خطة مجانية؟',
                answer: 'لا. يوجد Trial كامل لمدة 14 يومًا فقط، وبعده تختار إحدى الخطط المدفوعة للاستمرار.',
              },
              {
                question: 'هل السعر لكل مستخدم؟',
                answer: 'لا. كل خطة تشمل العدد المكتوب من المستخدمين بسعر واحد للشركة، وهو فرق مهم عن أغلب المنافسين العالميين.',
              },
              {
                question: 'ماذا لو تجاوزنا 50 مستخدمًا؟',
                answer: 'نجهّز عرضًا مخصصًا حسب عدد الفروع والمستخدمين وحجم التشغيل، مع خطة انتقال واضحة بدون فقد بيانات.',
              },
            ].map((item) => (
              <div key={item.question} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <FileText className="h-5 w-5 text-blue-600" />
                <h3 className="mt-4 font-black text-slate-950">{item.question}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{item.answer}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
            <Headphones className="h-4 w-4 text-blue-600" />
            التجهيز الأساسي ودعم بدء التشغيل مشمولان في كل الخطط.
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-slate-500 sm:flex-row sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Vogantra. جميع الحقوق محفوظة.</p>
          <div className="flex items-center gap-5">
            <Link to="/" className="hover:text-blue-700">الرئيسية</Link>
            <Link to="/privacy" className="hover:text-blue-700">الخصوصية</Link>
            <Link to="/login" className="hover:text-blue-700">تسجيل الدخول</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
