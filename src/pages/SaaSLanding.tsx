import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowUpLeft,
  BarChart3,
  Building2,
  CheckCircle2,
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

import VogantraLogo from '@/components/brand/VogantraLogo';
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
    accent: 'from-sky-500 to-blue-600',
  },
  {
    number: '02',
    icon: FileText,
    title: 'التسعير والعرض',
    description: 'جهّز عرض السعر، راجع التكلفة وحدد هامش الربح قبل الإرسال.',
    accent: 'from-blue-600 to-indigo-600',
  },
  {
    number: '03',
    icon: Route,
    title: 'الحجز والتشغيل',
    description: 'حوّل العرض إلى حجز وتابع المورد والتأكيد والمستندات من مكان واحد.',
    accent: 'from-indigo-600 to-violet-600',
  },
  {
    number: '04',
    icon: CircleDollarSign,
    title: 'التحصيل والربح',
    description: 'تابع المدفوعات والمستحقات وصافي الربح بصورة واضحة وقابلة للمراجعة.',
    accent: 'from-violet-600 to-fuchsia-600',
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
    question: 'ما الفرق بين Vogantra وأي CRM عام؟',
    answer:
      'Vogantra مبني حول دورة عمل شركة السياحة نفسها: طلب عميل، عرض سعر، حجز، تشغيل، مورد، تحصيل وربح. لذلك لا تحتاج لتجميع عدة أدوات منفصلة حتى تدير العملية كاملة.',
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
      'أنشئ حساب شركتك، أضف أعضاء الفريق وحدد الأدوار، ثم ابدأ بتسجيل أول عميل أو طلب. فترة التجربة المتاحة هي 14 يومًا.',
  },
];

const trustPoints = [
  { icon: Workflow, label: 'دورة عمل مترابطة' },
  { icon: UserRoundCheck, label: 'صلاحيات حسب الوظيفة' },
  { icon: TrendingUp, label: 'رؤية مالية وتشغيلية' },
  { icon: Headphones, label: 'واجهة ودعم بالعربية' },
];

const BrandLockup = ({ compact = false }: { compact?: boolean }) => (
  <span className="inline-flex items-center gap-2.5" aria-label="Vogantra">
    <VogantraLogo variant="mark" size={compact ? 'sm' : 'md'} />
    <span className="flex flex-col text-left" dir="ltr">
      <span className="text-[15px] font-black tracking-[0.18em] text-[#07192f] sm:text-base">VOGANTRA</span>
      {!compact && (
        <span className="hidden text-[7px] font-bold tracking-[0.16em] text-slate-400 sm:block">
          SMART SOLUTIONS. BETTER BUSINESS.
        </span>
      )}
    </span>
  </span>
);

const DashboardPreview = () => (
  <div className="relative mx-auto w-full max-w-[680px]" aria-label="معاينة توضيحية للوحة تحكم Vogantra">
    <div className="absolute -inset-10 rounded-full bg-blue-500/20 blur-3xl" aria-hidden="true" />
    <div className="relative overflow-hidden rounded-[1.7rem] border border-white/15 bg-[#0b1b31] p-2 shadow-[0_35px_90px_-30px_rgba(15,101,255,0.55)] sm:p-3">
      <div className="overflow-hidden rounded-[1.25rem] border border-slate-200/90 bg-slate-50 text-slate-950">
        <div className="flex h-12 items-center justify-between border-b border-slate-200 bg-white px-4 sm:h-14 sm:px-5">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 sm:text-xs">
            <LayoutDashboard className="h-3.5 w-3.5 text-blue-600" />
            لوحة الإدارة
            <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-400">بيانات توضيحية</span>
          </div>
        </div>

        <div className="grid min-h-[390px] grid-cols-1 sm:grid-cols-[1fr_112px]">
          <div className="order-2 p-3 sm:order-1 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium text-slate-400 sm:text-xs">نظرة سريعة</p>
                <h3 className="mt-0.5 text-sm font-bold text-slate-900 sm:text-base">صباح الخير، فريق العمليات</h3>
              </div>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: 'طلبات مفتوحة', value: '18', icon: MessageSquareText, tone: 'bg-blue-50 text-blue-700' },
                { label: 'حجوزات الشهر', value: '42', icon: FileCheck2, tone: 'bg-violet-50 text-violet-700' },
                { label: 'تحصيل منتظر', value: '7', icon: WalletCards, tone: 'bg-amber-50 text-amber-700' },
              ].map(item => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
                  <div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${item.tone}`}>
                    <item.icon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-base font-extrabold text-slate-950 sm:text-xl">{item.value}</p>
                  <p className="mt-0.5 truncate text-[8px] font-medium text-slate-400 sm:text-[10px]">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-[1.35fr_.65fr]">
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold text-slate-800 sm:text-xs">الحجوزات والإيرادات</p>
                    <p className="text-[8px] text-slate-400 sm:text-[9px]">آخر 6 أشهر</p>
                  </div>
                  <div className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                    <TrendingUp className="h-3 w-3" />
                    اتجاه صاعد
                  </div>
                </div>
                <div className="flex h-24 items-end gap-2 border-b border-l border-slate-100 px-1 sm:h-28">
                  {[42, 58, 47, 73, 64, 88, 78, 96].map((height, index) => (
                    <div key={index} className="flex h-full flex-1 items-end">
                      <div
                        className="w-full rounded-t bg-gradient-to-t from-blue-700 to-sky-400 opacity-90"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <p className="text-[10px] font-bold text-slate-800 sm:text-xs">حالة الطلبات</p>
                <div className="mt-4 space-y-3">
                  {[
                    { label: 'قيد التسعير', value: '8', color: 'bg-blue-600', width: '78%' },
                    { label: 'بانتظار العميل', value: '6', color: 'bg-violet-500', width: '58%' },
                    { label: 'قيد التأكيد', value: '4', color: 'bg-amber-500', width: '40%' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="mb-1 flex justify-between text-[8px] font-medium text-slate-500 sm:text-[9px]">
                        <span>{item.label}</span>
                        <span>{item.value}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: item.width }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2.5">
                <p className="text-[10px] font-bold text-slate-800 sm:text-xs">آخر الطلبات</p>
                <span className="text-[8px] font-semibold text-blue-600 sm:text-[9px]">عرض الكل</span>
              </div>
              {[
                ['طلب فندق شرم الشيخ', 'قيد التسعير', 'bg-blue-50 text-blue-700'],
                ['رحلة عائلية إلى إسطنبول', 'بانتظار العميل', 'bg-violet-50 text-violet-700'],
              ].map(([title, status, tone]) => (
                <div key={title} className="flex items-center justify-between border-b border-slate-100 px-3 py-2 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-slate-500">
                      <Plane className="h-3 w-3" />
                    </span>
                    <span className="text-[9px] font-semibold text-slate-700 sm:text-[10px]">{title}</span>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[7px] font-bold sm:text-[8px] ${tone}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>

          <aside className="order-1 hidden border-l border-slate-200 bg-white p-3 sm:order-2 sm:block">
            <div className="mb-5 flex items-center gap-2 px-1">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 text-sm font-black text-white">V</div>
              <span className="text-[10px] font-black tracking-[0.16em] text-slate-900">VOGANTRA</span>
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
                    item.active ? 'bg-blue-50 text-blue-700' : 'text-slate-400'
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
    <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
      {eyebrow}
    </span>
    <h2 className="text-3xl font-black leading-[1.25] text-[#07192f] sm:text-4xl lg:text-5xl">{title}</h2>
    <p className="mt-4 text-base leading-8 text-slate-600 sm:text-lg">{description}</p>
  </div>
);

const SaaSLanding = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f7f9fc] font-['Cairo',sans-serif] text-[#07192f]" dir="rtl">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className={`${pageContainer} flex h-[72px] items-center justify-between`}>
          <Link to="/" className="flex items-center" aria-label="العودة إلى صفحة Vogantra الرئيسية">
            <BrandLockup />
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 lg:flex" aria-label="التنقل الرئيسي">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-blue-700">
                {link.label}
              </a>
            ))}
            <Link to="/pricing" className="transition-colors hover:text-blue-700">
              الأسعار
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="hidden sm:inline-flex">
              <Button variant="ghost" className="font-bold text-slate-700 hover:bg-slate-100">
                تسجيل الدخول
              </Button>
            </Link>
            <Link to="/signup">
              <Button className="h-10 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 sm:px-5 sm:text-sm">
                ابدأ مجانًا
                <ArrowLeft className="mr-2 h-4 w-4" />
              </Button>
            </Link>

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="فتح القائمة">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] border-slate-200 bg-white">
                <div className="mt-7 flex flex-col gap-5">
                  <Link to="/" onClick={() => setMobileMenuOpen(false)} aria-label="Vogantra">
                    <BrandLockup compact />
                  </Link>
                  <nav className="flex flex-col gap-1" aria-label="قائمة الموبايل">
                    {navLinks.map(link => (
                      <a
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        {link.label}
                      </a>
                    ))}
                    <Link
                      to="/pricing"
                      onClick={() => setMobileMenuOpen(false)}
                      className="rounded-xl px-3 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700"
                    >
                      الأسعار
                    </Link>
                  </nav>
                  <div className="space-y-2 border-t border-slate-200 pt-5">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full rounded-xl">تسجيل الدخول</Button>
                    </Link>
                    <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full rounded-xl bg-blue-600 text-white hover:bg-blue-700">ابدأ التجربة</Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-[#071426] pb-20 pt-14 text-white sm:pb-24 sm:pt-20 lg:pb-28 lg:pt-24">
          <div className="absolute -right-48 top-0 h-[520px] w-[520px] rounded-full bg-blue-600/20 blur-[120px]" aria-hidden="true" />
          <div className="absolute -left-40 bottom-0 h-[480px] w-[480px] rounded-full bg-violet-600/20 blur-[130px]" aria-hidden="true" />
          <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,.7)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.7)_1px,transparent_1px)] [background-size:54px_54px]" aria-hidden="true" />

          <div className={`${pageContainer} relative grid items-center gap-14 lg:grid-cols-[.9fr_1.1fr] lg:gap-12`}>
            <div className="text-center lg:text-right">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-sky-300/10 px-4 py-2 text-xs font-bold text-sky-200 sm:text-sm">
                <Sparkles className="h-4 w-4" />
                نظام تشغيل متكامل لشركات السياحة
              </div>
              <h1 className="text-4xl font-black leading-[1.25] tracking-tight sm:text-5xl lg:text-[4.15rem] lg:leading-[1.18]">
                شغّل شركتك من أول طلب
                <span className="block bg-gradient-to-l from-sky-300 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  لحد تحصيل الربح.
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg lg:mx-0 lg:max-w-xl">
                Vogantra يجمع إدارة العملاء، عروض الأسعار، الحجوزات، التشغيل والحسابات في منصة واحدة مصممة لطريقة عمل شركات السياحة العربية.
              </p>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
                <Link to="/signup">
                  <Button size="lg" className="h-[52px] w-full rounded-xl bg-blue-600 px-7 text-base font-extrabold text-white shadow-xl shadow-blue-600/30 hover:bg-blue-500 sm:w-auto">
                    ابدأ تجربة 14 يومًا
                    <ArrowLeft className="mr-2 h-5 w-5" />
                  </Button>
                </Link>
                <a href="#platform">
                  <Button size="lg" variant="outline" className="h-[52px] w-full rounded-xl border-white/20 bg-white/5 px-7 text-base font-bold text-white hover:bg-white/10 hover:text-white sm:w-auto">
                    استكشف المنصة
                    <ArrowUpLeft className="mr-2 h-5 w-5" />
                  </Button>
                </a>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-xs font-medium text-slate-400 sm:text-sm lg:justify-start">
                {['إعداد سريع', 'واجهة عربية RTL', 'صلاحيات دقيقة'].map(item => (
                  <span key={item} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <DashboardPreview />
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white py-6 sm:py-8">
          <div className={pageContainer}>
            <p className="mb-5 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              كل الأساسيات التي يحتاجها فريقك للعمل من نفس المصدر
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {trustPoints.map(item => (
                <div key={item.label} className="flex items-center justify-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-600 sm:text-sm">
                  <item.icon className="h-4 w-4 text-blue-600" />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="scroll-mt-24 bg-[#f7f9fc] py-20 sm:py-24 lg:py-28">
          <div className={pageContainer}>
            <SectionHeading
              eyebrow="من الطلب إلى الربح"
              title="دورة عمل واحدة بدل أدوات متفرقة"
              description="كل قسم يستلم ما يحتاجه، يعرف الخطوة التالية، ويسلّم المرحلة التالية بدون فقدان معلومات أو تكرار إدخال البيانات."
            />

            <div className="relative mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
              <div className="absolute left-[12%] right-[12%] top-8 hidden h-px bg-gradient-to-l from-blue-200 via-indigo-200 to-violet-200 lg:block" aria-hidden="true" />
              {workflowSteps.map((step, index) => (
                <article key={step.number} className="group relative rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_-35px_rgba(15,23,42,.35)] transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_24px_60px_-35px_rgba(37,99,235,.35)]">
                  <div className="relative z-10 mb-5 flex items-center justify-between">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${step.accent} text-white shadow-lg`}>
                      <step.icon className="h-6 w-6" />
                    </div>
                    <span className="text-sm font-black tracking-widest text-slate-300">{step.number}</span>
                  </div>
                  <h3 className="text-lg font-extrabold text-[#07192f]">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{step.description}</p>
                  {index < workflowSteps.length - 1 && (
                    <ChevronLeft className="absolute -left-4 top-7 z-20 hidden h-4 w-4 text-blue-300 lg:block" aria-hidden="true" />
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="platform" className="scroll-mt-24 border-y border-slate-200 bg-white py-20 sm:py-24 lg:py-28">
          <div className={pageContainer}>
            <SectionHeading
              eyebrow="منصة واحدة"
              title="كل فريقك يرى نفس الصورة"
              description="بدل ما تكون بيانات العميل في مكان، الحجز في مكان، والحسابات في ملف مختلف—Vogantra يربطهم كلهم في سجل واحد."
            />

            <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {capabilities.map((feature, index) => (
                <article
                  key={feature.title}
                  className={`group relative overflow-hidden rounded-3xl border border-slate-200 p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-950/5 sm:p-7 ${
                    index === 0 || index === 3 ? 'bg-[#07192f] text-white' : 'bg-[#f8fafc] text-[#07192f]'
                  }`}
                >
                  {(index === 0 || index === 3) && (
                    <div className="absolute -left-14 -top-14 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" aria-hidden="true" />
                  )}
                  <div className={`relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${
                    index === 0 || index === 3 ? 'bg-blue-500 text-white' : 'border border-blue-100 bg-blue-50 text-blue-700'
                  }`}>
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="relative text-xl font-black">{feature.title}</h3>
                  <p className={`relative mt-3 text-sm leading-7 ${index === 0 || index === 3 ? 'text-slate-300' : 'text-slate-600'}`}>
                    {feature.description}
                  </p>

                  {index === 0 && (
                    <div className="relative mt-6 space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                      {['متابعة العميل القادم', 'عرض سعر بانتظار الرد', 'طلب جاهز للتسليم'].map((item, itemIndex) => (
                        <div key={item} className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-200">
                          <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${['bg-sky-400', 'bg-amber-400', 'bg-emerald-400'][itemIndex]}`} />{item}</span>
                          <ChevronLeft className="h-3.5 w-3.5 text-slate-500" />
                        </div>
                      ))}
                    </div>
                  )}

                  {index === 3 && (
                    <div className="relative mt-6 grid grid-cols-6 gap-2">
                      {[38, 62, 48, 76, 66, 92].map((height, barIndex) => (
                        <div key={barIndex} className="flex h-16 items-end rounded-lg bg-white/5 p-1.5">
                          <div className="w-full rounded-md bg-gradient-to-t from-blue-600 to-sky-300" style={{ height: `${height}%` }} />
                        </div>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link to="/signup">
                <Button className="h-12 rounded-xl bg-[#07192f] px-7 text-sm font-extrabold text-white hover:bg-blue-800">
                  جرّب المنصة على بيانات شركتك
                  <ArrowLeft className="mr-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section id="control" className="scroll-mt-24 bg-[#071426] py-20 text-white sm:py-24 lg:py-28">
          <div className={`${pageContainer} grid items-center gap-12 lg:grid-cols-[.9fr_1.1fr]`}>
            <div>
              <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-sky-300">
                <ShieldCheck className="h-4 w-4" />
                تحكم يناسب نمو شركتك
              </span>
              <h2 className="text-3xl font-black leading-[1.3] sm:text-4xl lg:text-5xl">
                النظام يرتّب الصلاحيات،
                <span className="block text-sky-300">وأنت تركز على القرار.</span>
              </h2>
              <p className="mt-5 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                وضّح مسؤولية كل قسم، حافظ على فصل البيانات، وراجع ما حدث داخل كل عملية بدون الاعتماد على الذاكرة أو الرسائل المتناثرة.
              </p>
              <Link to="/signup" className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-sky-300 transition-colors hover:text-sky-200">
                ابدأ إعداد فريقك
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {controlPoints.map(point => (
                <article key={point.title} className="group flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.055] p-5 transition hover:border-blue-400/30 hover:bg-white/[0.08] sm:p-6 lg:flex-row lg:items-center">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-400/10 text-sky-300">
                    <point.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-white">{point.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">{point.description}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white py-20 sm:py-24">
          <div className={pageContainer}>
            <div className="overflow-hidden rounded-[2rem] border border-blue-100 bg-gradient-to-l from-blue-50 via-white to-indigo-50 p-7 sm:p-10 lg:p-12">
              <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700">14 يومًا للتجربة</span>
                  <h2 className="mt-3 text-3xl font-black leading-tight text-[#07192f] sm:text-4xl">
                    اختبر دورة عملك الحقيقية داخل Vogantra.
                  </h2>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
                    أضف فريقك، سجّل أول طلب، وتابع انتقاله بين الأقسام قبل اتخاذ قرار الاشتراك.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Link to="/signup">
                    <Button size="lg" className="w-full rounded-xl bg-blue-600 px-7 font-extrabold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700">
                      ابدأ التجربة الآن
                      <ArrowLeft className="mr-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/pricing">
                    <Button size="lg" variant="outline" className="w-full rounded-xl border-slate-300 bg-white px-7 font-bold text-slate-700 hover:bg-slate-50">
                      شاهد الخطط
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="scroll-mt-24 border-t border-slate-200 bg-[#f7f9fc] py-20 sm:py-24">
          <div className={`${pageContainer} grid gap-12 lg:grid-cols-[.72fr_1.28fr]`}>
            <div>
              <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                أسئلة مهمة قبل البداية
              </span>
              <h2 className="text-3xl font-black leading-[1.3] text-[#07192f] sm:text-4xl">إجابات واضحة، بدون كلام تسويقي زائد.</h2>
              <p className="mt-4 text-base leading-8 text-slate-600">
                لو عندك سؤال خاص بطريقة تشغيل شركتك، ابدأ التجربة أو تواصل مع فريق الدعم من داخل النظام.
              </p>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, index) => (
                <AccordionItem key={faq.question} value={`faq-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 shadow-sm data-[state=open]:border-blue-200">
                  <AccordionTrigger className="py-5 text-right text-sm font-extrabold text-[#07192f] hover:no-underline sm:text-base">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-7 text-slate-600">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        <section className="relative overflow-hidden bg-blue-600 py-16 text-white sm:py-20">
          <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-sky-300/20 blur-3xl" aria-hidden="true" />
          <div className="absolute -left-24 bottom-0 h-72 w-72 rounded-full bg-indigo-900/20 blur-3xl" aria-hidden="true" />
          <div className={`${pageContainer} relative text-center`}>
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/10">
              <Plane className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-black sm:text-4xl lg:text-5xl">خلّي فريقك يشتغل كنظام واحد.</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-blue-100 sm:text-lg">
              ابدأ تجربة Vogantra لمدة 14 يومًا واختبر الفرق على دورة عمل شركتك الفعلية.
            </p>
            <Link to="/signup" className="mt-8 inline-flex">
              <Button size="lg" className="h-[52px] rounded-xl bg-white px-8 text-base font-black text-blue-700 shadow-xl hover:bg-blue-50">
                أنشئ حساب شركتك
                <ArrowLeft className="mr-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-10">
        <div className={`${pageContainer} grid gap-8 md:grid-cols-[1fr_auto] md:items-center`}>
          <div>
            <BrandLockup />
            <p className="mt-3 max-w-md text-xs leading-6 text-slate-500">
              منصة لإدارة دورة العمل داخل شركات السياحة والسفر—من طلب العميل حتى الحجز والتحصيل والربحية.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs font-semibold text-slate-500 sm:text-sm">
            <a href="#workflow" className="hover:text-blue-700">دورة العمل</a>
            <a href="#platform" className="hover:text-blue-700">المنصة</a>
            <Link to="/pricing" className="hover:text-blue-700">الأسعار</Link>
            <Link to="/privacy" className="hover:text-blue-700">الخصوصية</Link>
          </div>
        </div>
        <div className={`${pageContainer} mt-8 border-t border-slate-100 pt-6 text-xs text-slate-400`}>
          © {new Date().getFullYear()} Vogantra. جميع الحقوق محفوظة.
        </div>
      </footer>
    </div>
  );
};

export default SaaSLanding;
