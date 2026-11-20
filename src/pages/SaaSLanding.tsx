import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSafarLandingSettings } from '@/hooks/useSafarLandingSettings';
import { safarLandingDefaults } from '@/lib/safarLandingSettings';
import {
  ArrowLeft,
  BarChart3,
  Building2,
  ChevronLeft,
  CircleDollarSign,
  FileCheck2,
  FileText,
  Headphones,
  Hotel,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  MessageSquareText,
  Phone,
  Plane,
  ReceiptText,
  Route,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserRoundCheck,
  Users,
  WalletCards,
  Workflow,
} from 'lucide-react';

import SafarERPLogo from '@/components/brand/VogantraLogo';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const pageContainer = 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8';

const navLinks = [
  { href: '#workflow', label: 'دورة العمل' },
  { href: '#platform', label: 'المنصة' },
  { href: '#control', label: 'التحكم' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
];

const workflowSteps = [
  {
    number: '01',
    icon: MessageSquareText,
    title: 'استقبال الطلب',
    description: 'سجّل بيانات العميل واحتياجه من أول تواصل بدون فقدان أي تفصيلة.',
    accent: 'from-primary to-primary',
  },
  {
    number: '02',
    icon: FileText,
    title: 'التسعير والعرض',
    description: 'جهّز عرض السعر، راجع التكلفة وحدد هامش الربح قبل الإرسال.',
    accent: 'from-primary to-primary',
  },
  {
    number: '03',
    icon: Route,
    title: 'الحجز والتشغيل',
    description: 'حوّل العرض إلى حجز وتابع المورد والتأكيد والمستندات من مكان واحد.',
    accent: 'from-primary to-primary',
  },
  {
    number: '04',
    icon: CircleDollarSign,
    title: 'التحصيل والربح',
    description: 'تابع المدفوعات والمستحقات وصافي الربح بصورة واضحة وقابلة للمراجعة.',
    accent: 'from-primary to-primary',
  },
];

const capabilities = [
  {
    icon: Users,
    title: 'CRM مخصص للسياحة',
    description: 'ملف موحد لكل عميل، طلباته، عروضه، حجوزاته، ومتابعات الفريق معه.',
  },
  {
    icon: Hotel,
    title: 'حجوزات متعددة الخدمات',
    description: 'فنادق وطيران ونقل وخدمات إضافية ضمن دورة تشغيل واحدة مترابطة.',
  },
  {
    icon: ReceiptText,
    title: 'فواتير ومستحقات',
    description: 'راقب ما تم تحصيله وما تبقى للعميل أو للمورد بدون حسابات متفرقة.',
  },
  {
    icon: BarChart3,
    title: 'تقارير تساعدك تقرر',
    description: 'تابع المبيعات والتكلفة والربحية وأداء التشغيل من لوحات واضحة.',
  },
  {
    icon: Workflow,
    title: 'تسليم منظم بين الأقسام',
    description: 'انقل الطلب من خدمة العملاء للمبيعات ثم الحجوزات وفق خطوات محددة.',
  },
  {
    icon: FileCheck2,
    title: 'مستندات وسجل مراجعة',
    description: 'احفظ مستندات الحجز واعرف من نفّذ كل خطوة ومتى تمت داخل النظام.',
  },
];

const controlPoints = [
  {
    icon: LockKeyhole,
    title: 'صلاحيات حسب الدور',
    description: 'كل موظف يرى وينفّذ ما يخص مسؤوليته فقط.',
  },
  {
    icon: Building2,
    title: 'بيانات كل شركة منفصلة',
    description: 'تنظيم متعدد الشركات مع فصل بيانات كل جهة داخل المنصة.',
  },
  {
    icon: ShieldCheck,
    title: 'سجل عمليات واضح',
    description: 'تتبّع التغييرات والاعتمادات لتسهيل المراجعة والمساءلة.',
  },
];

const faqs = [
  {
    question: 'ما الفرق بين SafarERP وأي CRM عام؟',
    answer:
      'SafarERP مبني حول دورة عمل شركة السياحة نفسها: طلب عميل، عرض سعر، حجز، تشغيل، مورد، تحصيل وربح. لذلك لا تحتاج لتجميع عدة أدوات منفصلة حتى تدير العملية كاملة.',
  },
  {
    question: 'هل النظام مناسب لتقسيم العمل بين الأقسام؟',
    answer:
      'نعم. يمكنك تنظيم انتقال الطلب بين خدمة العملاء والمبيعات والحجوزات والحسابات، مع صلاحيات ومهام وحالة واضحة لكل مرحلة.',
  },
  {
    question: 'هل أستطيع معرفة ربح كل حجز؟',
    answer:
      'نعم. يربط النظام سعر البيع بالتكاليف والمدفوعات المرتبطة بالحجز، لتكون متابعة الربحية والمستحقات في نفس الملف.',
  },
  {
    question: 'هل الواجهة عربية؟',
    answer:
      'نعم. تجربة الاستخدام الأساسية عربية وباتجاه RTL، ومصممة لتناسب فرق شركات السياحة في المنطقة.',
  },
  {
    question: 'كيف أبدأ التجربة؟',
    answer:
      'أنشئ حساب شركتك، أضف أعضاء الفريق وحدد الأدوار، ثم ابدأ بتسجيل أول عميل أو طلب. فترة التجربة المتاحة هي 7 أيام.',
  },
];

const trustPoints = [
  { icon: Workflow, label: 'دورة عمل مترابطة' },
  { icon: UserRoundCheck, label: 'صلاحيات حسب الوظيفة' },
  { icon: TrendingUp, label: 'رؤية مالية وتشغيلية' },
  { icon: Headphones, label: 'واجهة ودعم بالعربية' },
];

const BrandLockup = ({ compact = false }: { compact?: boolean }) => (
  <SafarERPLogo size={compact ? 'sm' : 'md'} />
);

const DashboardPreview = () => (
  <div className="relative mx-auto w-full max-w-[680px]" aria-label="معاينة توضيحية للوحة تحكم SafarERP">
    <div className="relative overflow-hidden rounded-lg border border-brand-ivory/15 bg-brand-navy p-2 shadow-[0_35px_90px_-30px_rgba(15,101,255,0.55)] sm:p-3">
      <div className="overflow-hidden rounded-lg border border-border/90 bg-muted text-foreground">
        <div className="flex h-12 items-center justify-between border-b border-border bg-card px-4 sm:h-14 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
            <span className="h-2.5 w-2.5 rounded-full bg-success" />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-muted-foreground sm:text-xs">
            <LayoutDashboard className="h-3.5 w-3.5 text-brand-gold" />
            لوحة الإدارة
            <span className="rounded-full bg-muted px-2 py-1 text-[9px] font-medium text-muted-foreground">بيانات توضيحية</span>
          </div>
        </div>

        <div className="grid min-h-[390px] grid-cols-1 sm:grid-cols-[1fr_112px]">
          <div className="order-2 p-3 sm:order-1 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-muted-foreground sm:text-xs">نظرة سريعة</p>
                <h3 className="mt-0.5 text-sm font-bold text-foreground sm:text-base">صباح الخير، فريق العمليات</h3>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: 'طلبات مفتوحة', value: '18', icon: MessageSquareText, tone: 'bg-muted text-brand-gold' },
                { label: 'حجوزات الشهر', value: '42', icon: FileCheck2, tone: 'bg-muted text-brand-gold' },
                { label: 'تحصيل منتظر', value: '7', icon: WalletCards, tone: 'bg-success/10 text-success' },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-border bg-card p-2.5 shadow-sm sm:p-3">
                  <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${item.tone}`}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-base font-extrabold text-foreground sm:text-xl">{item.value}</p>
                  <p className="mt-0.5 truncate text-[8px] font-medium text-muted-foreground sm:text-[10px]">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[1.35fr_.65fr]">
              <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-foreground sm:text-xs">الحجوزات والإيرادات</p>
                    <p className="text-[8px] text-muted-foreground sm:text-[9px]">آخر 6 أشهر</p>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-semibold text-success">
                    <TrendingUp className="h-3 w-3" />
                    اتجاه صاعد
                  </div>
                </div>
                <div className="flex h-24 items-end gap-2 border-b border-l border-border px-1 sm:h-28">
                  {[42, 58, 47, 73, 64, 88, 78, 96].map((height, index) => (
                    <div key={index} className="flex h-full flex-1 items-end">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-primary to-primary opacity-90"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <p className="text-[10px] font-bold text-foreground sm:text-xs">حالة الطلبات</p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'قيد التسعير', value: '8', color: 'bg-primary', width: '78%' },
                    { label: 'بانتظار العميل', value: '6', color: 'bg-primary', width: '58%' },
                    { label: 'قيد التأكيد', value: '4', color: 'bg-success', width: '40%' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="mb-1 flex justify-between text-[8px] font-medium text-muted-foreground sm:text-[9px]">
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                <p className="text-[10px] font-bold text-foreground sm:text-xs">آخر الطلبات</p>
                <span className="text-[8px] font-semibold text-brand-gold sm:text-[9px]">عرض الكل</span>
              </div>
              {[
                ['طلب فندق شرم الشيخ', 'قيد التسعير', 'bg-muted text-brand-gold'],
                ['رحلة عائلية إلى إسطنبول', 'بانتظار العميل', 'bg-muted text-brand-gold'],
              ].map(([title, status, tone]) => (
                <div key={title} className="flex items-center justify-between border-b border-border px-3 py-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                      <Plane className="h-3 w-3" />
                    </span>
                    <span className="text-[9px] font-semibold text-foreground sm:text-[10px]">{title}</span>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[7px] font-bold sm:text-[8px] ${tone}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="order-1 hidden border-l border-border bg-card p-3 sm:order-2 sm:block">
            <div className="mb-5 flex items-center gap-2 px-1">
              <SafarERPLogo variant="mark" size="sm" />
              <span className="text-[10px] font-black tracking-normal text-foreground">SafarERP</span>
            </div>
            <div className="space-y-1">
              {[
                { icon: LayoutDashboard, label: 'الرئيسية', active: true },
                { icon: MessageSquareText, label: 'الطلبات' },
                { icon: FileCheck2, label: 'الحجوزات' },
                { icon: Users, label: 'العملاء' },
                { icon: ReceiptText, label: 'الحسابات' },
              ].map(item => (
                <div
                  key={item.label}
                  className={`flex items-center gap-2 rounded-lg px-2 py-2 text-[9px] font-semibold ${
                    item.active ? 'bg-muted text-brand-gold' : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  </div>
);

const SectionHeading = ({
  eyebrow,
  title,
  description,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  description: string;
  align?: 'center' | 'start';
}) => (
  <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl text-right'}>
    <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-bold text-brand-gold">
      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
      {eyebrow}
    </span>
    <h2 className="text-3xl font-black leading-[1.25] text-foreground sm:text-4xl lg:text-5xl">{title}</h2>
    <p className="mt-4 text-base leading-8 text-muted-foreground sm:text-lg">{description}</p>
  </div>
);

const SaaSLanding = () => {
  const { data: landing = safarLandingDefaults } = useSafarLandingSettings();
  const platformPhone = landing.safar_landing_phone;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background font-sans text-foreground" dir="rtl">
      <header className="sticky top-0 z-50 border-b border-border/80 bg-card/90 backdrop-blur-xl">
        <div className={`${pageContainer} flex h-16 items-center justify-between gap-2 sm:h-[72px]`}>
          <Link to="/" className="flex min-w-0 items-center" aria-label="العودة إلى صفحة SafarERP الرئيسية">
            <BrandLockup />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-muted-foreground lg:flex" aria-label="التنقل الرئيسي">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-brand-gold">
                {link.label}
              </a>
            ))}
            <Link to="/pricing" className="transition-colors hover:text-brand-gold">
              الأسعار
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button asChild variant="ghost" className="min-h-11 shrink-0 px-2 font-bold sm:px-4">
              <Link to="/login">تسجيل الدخول</Link>
            </Button>
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0 lg:hidden" aria-label="فتح القائمة">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" dir="rtl" aria-describedby={undefined} className="w-[min(100%,300px)] border-border bg-card">
                <SheetTitle className="sr-only">قائمة التنقل</SheetTitle>
                <div className="mt-7 flex flex-col gap-5">
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} aria-label="SafarERP">
                    <BrandLockup compact />
                  </Link>
                  <nav className="flex flex-col gap-1" aria-label="قائمة الموبايل">
                    {navLinks.map(link => (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded-xl px-3 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted hover:text-brand-gold"
                      >
                        {link.label}
                      </a>
                    ))}
                    <Link
                      to="/pricing"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-3 py-3 text-sm font-bold text-foreground transition-colors hover:bg-muted hover:text-brand-gold"
                    >
                      الأسعار
                    </Link>
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-brand-navy pb-14 pt-10 text-brand-ivory sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:54px_54px]" aria-hidden="true" />

          <div className={`${pageContainer} relative grid items-center gap-9 lg:grid-cols-[minmax(0,.9fr)_minmax(0,1.1fr)] lg:gap-12`}>
            <div className="text-center lg:text-right">
              <h1 className="text-4xl font-black leading-[1.2] tracking-normal sm:text-5xl lg:text-[4.15rem] lg:leading-[1.18]">
                SafarERP
                <span className="block text-brand-gold mt-2 text-2xl leading-tight sm:text-3xl">
                  {landing.safar_landing_headline}
                </span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-brand-ivory/80 sm:mt-6 sm:text-lg sm:leading-8 lg:mx-0 lg:max-w-xl">
                {landing.safar_landing_intro}
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 lg:justify-start">
                <Button asChild size="lg" className="min-h-12 w-full rounded-lg bg-brand-gold px-6 text-base font-bold text-brand-navy hover:bg-brand-gold/90 sm:w-auto">
                  <Link to="/signup">
                    ابدأ تجربة 7 أيام
                    <ArrowLeft className="h-5 w-5" aria-hidden="true" />
                  </Link>
                </Button>
                <Link to="/pricing" className="inline-flex min-h-11 items-center rounded-md px-2 text-sm font-bold text-brand-ivory underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-gold">
                  قارن الباقات والأسعار
                </Link>
              </div>
              <p className="mt-2 text-sm leading-6 text-brand-ivory/80">
                سجّل ببريد عمل شركتك. التجربة مجانية وبدون بطاقة دفع.
              </p>
            </div>

            <DashboardPreview />
          </div>
        </section>

        <section className="border-b border-border bg-card py-6 sm:py-8">
          <div className={pageContainer}>
            <p className="mb-5 text-center text-xs font-bold uppercase tracking-normal text-muted-foreground">
              كل الأساسيات التي يحتاجها فريقك للعمل من نفس المصدر
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {trustPoints.map(item => (
                <div key={item.label} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-muted px-3 py-3 text-xs font-bold text-muted-foreground sm:text-sm">
                  <item.icon className="h-4 w-4 text-brand-gold" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 bg-background py-20 sm:py-24 lg:py-28">
          <div className={pageContainer}>
            <SectionHeading
              eyebrow="من الطلب إلى الربح"
              title="دورة عمل واحدة بدل أدوات متفرقة"
              description="كل قسم يستلم ما يحتاجه، يعرف الخطوة التالية، ويسلّم المرحلة التالية بدون فقدان معلومات أو تكرار إدخال البيانات."
            />

            <div className="relative mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              <div className="absolute left-[12%] right-[12%] top-8 hidden h-px bg-gradient-to-l from-primary via-primary to-primary lg:block" aria-hidden="true" />
              {workflowSteps.map((step, index) => (
                <article key={step.number} className="group relative rounded-lg border border-border bg-card p-6 shadow-[0_16px_50px_-35px_rgba(15,23,42,.35)] transition duration-300 hover:-translate-y-1 hover:border-border hover:shadow-[0_24px_60px_-35px_rgba(37,99,235,.35)]">
                  <div className="relative z-10 mb-5 flex items-center justify-between">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-lg bg-gradient-to-br ${step.accent} text-brand-ivory shadow-lg`}>
                      <step.icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-black tracking-normal text-muted-foreground">{step.number}</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.description}</p>
                  {index < workflowSteps.length - 1 && (
                    <ChevronLeft className="absolute -left-4 top-7 z-20 hidden h-4 w-4 text-brand-gold lg:block" aria-hidden="true" />
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="scroll-mt-24 border-y border-border bg-card py-20 sm:py-24 lg:py-28">
          <div className={pageContainer}>
            <SectionHeading
              eyebrow="منصة واحدة"
              title="كل فريقك يرى نفس الصورة"
              description="بدل ما تكون بيانات العميل في مكان، الحجز في مكان، والحسابات في ملف مختلف—SafarERP يربطهم كلهم في سجل واحد."
            />

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((feature, index) => (
                <article
                  key={feature.title}
                  className={`group relative overflow-hidden rounded-lg border border-border p-6 transition duration-300 hover:-translate-y-1 hover:border-border hover:shadow-xl hover:shadow-soft-md sm:p-7 ${
                    index === 0 || index === 3 ? 'bg-brand-navy text-brand-ivory' : 'bg-muted text-foreground'
                  }`}
                >
                  <div className={`relative mb-5 flex h-12 w-12 items-center justify-center rounded-lg ${
                    index === 0 || index === 3 ? 'bg-primary text-primary-foreground' : 'border border-border bg-muted text-brand-gold'
                  }`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="relative text-xl font-black">{feature.title}</h3>
                  <p className={`relative mt-3 text-sm leading-7 ${index === 0 || index === 3 ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                    {feature.description}
                  </p>

                  {index === 0 && (
                    <div className="relative mt-6 space-y-2 rounded-lg border border-brand-ivory/10 bg-card/5 p-3">
                      {['متابعة العميل القادم', 'عرض سعر بانتظار الرد', 'طلب جاهز للتسليم'].map((item, itemIndex) => (
                        <div key={item} className="flex items-center justify-between rounded-xl bg-card/5 px-3 py-2 text-[11px] font-semibold text-slate-200">
                          <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${['bg-sky-400', 'bg-success', 'bg-success'][itemIndex]}`} />{item}</span>
                          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                      ))}
                    </div>
                  )}

                  {index === 3 && (
                    <div className="relative mt-6 grid grid-cols-6 gap-2">
                      {[38, 62, 48, 76, 66, 92].map((height, barIndex) => (
                        <div key={barIndex} className="flex h-16 items-end rounded-lg bg-card/5 p-1.5">
                          <div className="w-full rounded-md bg-gradient-to-t from-primary to-primary" style={{ height: `${height}%` }} />
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>

          </div>
        </section>

        <section id="control" className="scroll-mt-24 bg-brand-navy py-20 text-brand-ivory sm:py-24 lg:py-28">
          <div className={`${pageContainer} grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]`}>
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-brand-ivory/10 bg-card/5 px-3 py-1.5 text-xs font-bold text-brand-gold">
                <ShieldCheck className="h-4 w-4" />
                تحكم يناسب نمو شركتك
              </span>
              <h2 className="text-3xl font-black leading-[1.3] sm:text-4xl lg:text-5xl">
                النظام يرتّب الصلاحيات،
                <span className="block text-brand-gold">وأنت تركز على القرار.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
                وضّح مسؤولية كل قسم، حافظ على فصل البيانات، وراجع ما حدث داخل كل عملية بدون الاعتماد على الذاكرة أو الرسائل المتناثرة.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {controlPoints.map(point => (
                <article key={point.title} className="group flex flex-col gap-4 rounded-lg border border-brand-ivory/10 bg-card/[0.055] p-5 transition hover:border-border/30 hover:bg-card/[0.08] sm:p-6 lg:flex-row lg:items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border/20 bg-blue-400/10 text-brand-gold">
                    <point.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-brand-ivory">{point.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{point.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 border-t border-border bg-background py-20 sm:py-24">
          <div className={`${pageContainer} grid gap-12 lg:grid-cols-[.72fr_1.28fr]`}>
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-bold text-brand-gold">
                أسئلة مهمة قبل البداية
              </span>
              <h2 className="text-3xl font-black leading-[1.3] text-foreground sm:text-4xl">إجابات واضحة، بدون كلام تسويقي زائد.</h2>
              <p className="mt-4 text-base leading-8 text-muted-foreground">
                لو عندك سؤال خاص بطريقة تشغيل شركتك، ابدأ التجربة أو تواصل مع فريق الدعم من داخل النظام.
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.question} value={`faq-${index}`} className="overflow-hidden rounded-lg border border-border bg-card px-5 shadow-sm data-[state=open]:border-border">
                  <AccordionTrigger className="py-5 text-right text-sm font-extrabold text-foreground hover:no-underline sm:text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-7 text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="relative overflow-hidden bg-primary py-16 text-brand-ivory sm:py-20">
          <div className={`${pageContainer} relative text-center`}>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-lg border border-brand-ivory/20 bg-card/10">
              <Plane className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">خلّي فريقك يشتغل كنظام واحد.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-brand-gold sm:text-lg">
              ابدأ تجربة SafarERP لمدة 7 أيام واختبر الفرق على دورة عمل شركتك الفعلية.
            </p>
            <Button asChild size="lg" className="mt-8 min-h-12 rounded-xl bg-card px-8 text-base font-bold text-brand-navy shadow-xl hover:bg-muted">
              <Link to="/signup">
                ابدأ تجربة 7 أيام
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card py-10">
        <div className={`${pageContainer} grid gap-8 md:grid-cols-[1fr_auto] md:items-center`}>
          <div>
            <BrandLockup />
            <p className="mt-3 max-w-md text-xs leading-6 text-muted-foreground">
              {landing.safar_landing_footer}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-semibold text-muted-foreground sm:text-sm">
            <a href="#workflow" className="hover:text-brand-gold">دورة العمل</a>
            <a href="#platform" className="hover:text-brand-gold">المنصة</a>
            <Link to="/pricing" className="hover:text-brand-gold">الأسعار</Link>
            <Link to="/terms" className="hover:text-brand-gold">الشروط والأحكام</Link>
            <Link to="/refund-policy" className="hover:text-brand-gold">سياسة الاسترداد</Link>
            <Link to="/privacy" className="hover:text-brand-gold">الخصوصية</Link>
          </div>
        </div>
        <div className={`${pageContainer} mt-8 flex flex-wrap items-center justify-between gap-x-4 border-t border-border pt-4 text-xs text-muted-foreground`}>
          <span>© {new Date().getFullYear()} SafarERP. جميع الحقوق محفوظة.</span>
          <a href={`tel:${platformPhone}`} className="inline-flex min-h-11 items-center gap-2 rounded-md hover:text-brand-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-gold">
            <Phone className="h-4 w-4" aria-hidden="true" />
            <bdi dir="ltr">{platformPhone}</bdi>
          </a>
        </div>
      </footer>
    </div>
  );
};

export default SaaSLanding;
