
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Plane, Hotel, Car, Users, BarChart3, Shield, 
  CheckCircle2, ArrowLeft, Globe, Zap, Clock,
  Star, MessageSquare, TrendingUp, FileText, CreditCard,
  Headphones, ChevronDown, Award, Target, Layers, Menu
} from 'lucide-react';
import VogantraLogo from '@/components/brand/VogantraLogo';
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
import { useState } from 'react';
import dashboardImg from '@/assets/dashboard-screenshot.jpg';
import bookingsImg from '@/assets/bookings-screenshot.jpg';

const features = [
  { icon: Hotel, title: 'حجوزات الفنادق', desc: 'إدارة حجوزات الفنادق مع تتبع التكاليف والأرباح وحالات الحجز تلقائياً' },
  { icon: Plane, title: 'حجوزات الطيران', desc: 'تتبع رحلات الطيران وتذاكر الركاب مع ربط شركات الطيران' },
  { icon: Car, title: 'تأجير السيارات', desc: 'إدارة عقود الإيجار والمركبات والموردين بسلاسة' },
  { icon: Users, title: 'إدارة العملاء CRM', desc: 'قاعدة بيانات عملاء متكاملة مع متابعة وتصنيف ذكي' },
  { icon: BarChart3, title: 'تقارير وتحليلات', desc: 'تقارير مالية وتحليلات أداء مفصلة لاتخاذ قرارات أفضل' },
  { icon: Shield, title: 'أمان متقدم', desc: 'عزل كامل للبيانات بين الشركات مع صلاحيات دقيقة' },
  { icon: FileText, title: 'فواتير احترافية', desc: 'إنشاء وإرسال فواتير احترافية بضغطة زر' },
  { icon: CreditCard, title: 'إدارة المدفوعات', desc: 'تتبع المدفوعات والمستحقات مع تنبيهات ذكية' },
  { icon: Headphones, title: 'دعم عربي متكامل', desc: 'واجهة عربية 100% مع دعم فني متخصص' },
];

const detailedFeatures = [
  {
    icon: Target,
    title: 'لوحة تحكم ذكية',
    desc: 'رؤية شاملة لأداء شركتك من مكان واحد — إحصائيات فورية، تنبيهات ذكية، وأرقام دقيقة.',
    image: dashboardImg,
    points: ['إحصائيات الحجوزات والإيرادات', 'تنبيهات المدفوعات المتأخرة', 'تقارير الأرباح اللحظية', 'أداء الموظفين والعملاء'],
  },
  {
    icon: Layers,
    title: 'إدارة الحجوزات الشاملة',
    desc: 'نظام متكامل لإدارة جميع أنواع الحجوزات — فنادق، طيران، وسيارات — في مكان واحد.',
    image: bookingsImg,
    points: ['ربط الحجوزات بالعملاء تلقائياً', 'حساب التكاليف والأرباح فوراً', 'تتبع حالة كل حجز', 'إرسال الفواتير والقسائم'],
  },
];

const testimonials = [
  { name: 'أحمد محمود', role: 'مدير شركة الفارس للسياحة', content: 'النظام وفّر علينا ساعات من العمل اليومي. أصبحنا نتابع كل شيء من مكان واحد بدل عشرات الملفات.', rating: 5, avatar: 'أ' },
  { name: 'سارة عبدالله', role: 'مديرة حجوزات — رحلات الخليج', content: 'أفضل ميزة هي التقارير المالية التلقائية. أصبح بإمكاننا معرفة أرباحنا لحظياً دون حسابات يدوية.', rating: 5, avatar: 'س' },
  { name: 'محمد الشريف', role: 'مؤسس ترافل برو', content: 'جربنا عدة أنظمة من قبل، لكن هذا النظام الأول الذي يفهم احتياجات شركات السياحة العربية فعلاً.', rating: 5, avatar: 'م' },
  { name: 'فاطمة حسن', role: 'مديرة عمليات — نسمة تورز', content: 'سهولة الاستخدام مذهلة. فريقنا بالكامل تعلم النظام في يوم واحد وبدأنا العمل فوراً.', rating: 5, avatar: 'ف' },
];

const stats = [
  { value: '+500', label: 'شركة سياحة' },
  { value: '+50,000', label: 'حجز شهرياً' },
  { value: '99.9%', label: 'وقت التشغيل' },
  { value: '+95%', label: 'رضا العملاء' },
];

const faqs = [
  { q: 'هل يمكنني تجربة النظام مجاناً؟', a: 'نعم! نوفر فترة تجريبية مجانية لمدة 14 يوماً مع جميع المميزات. لا نحتاج بطاقة ائتمان للتسجيل.' },
  { q: 'هل بيانات شركتي آمنة؟', a: 'بالتأكيد. نستخدم أعلى معايير الأمان مع عزل كامل لبيانات كل شركة. بياناتك مشفرة ومحمية بالكامل.' },
  { q: 'هل يدعم النظام اللغة العربية بالكامل؟', a: 'نعم، النظام مصمم بالكامل باللغة العربية مع واجهة RTL احترافية.' },
  { q: 'هل يمكنني ترقية أو تغيير خطتي لاحقاً؟', a: 'بالطبع! يمكنك الترقية أو التخفيض في أي وقت. يتم احتساب الفرق بشكل نسبي.' },
  { q: 'كم يستغرق إعداد النظام؟', a: 'التسجيل والإعداد يستغرق أقل من 5 دقائق. يمكنك البدء فوراً بعد التسجيل.' },
  { q: 'هل يوجد دعم فني؟', a: 'نعم، نوفر دعماً فنياً عبر البريد الإلكتروني والواتساب. الخطط الاحترافية تشمل دعم أولوية.' },
];

const plans = [
  { name: 'مجاني', nameEn: 'Free', price: '0', period: '/شهرياً', features: ['5 مستخدمين', '100 حجز شهرياً', '500 عميل', 'تقارير أساسية'], highlighted: false },
  { name: 'أساسي', nameEn: 'Basic', price: '299', period: 'ج.م/شهرياً', features: ['15 مستخدم', '500 حجز شهرياً', '2000 عميل', 'تقارير متقدمة', 'دعم بريد إلكتروني'], highlighted: false },
  { name: 'احترافي', nameEn: 'Pro', price: '599', period: 'ج.م/شهرياً', features: ['50 مستخدم', 'حجوزات غير محدودة', 'عملاء غير محدودين', 'تقارير مخصصة', 'دعم أولوية', 'API وصول'], highlighted: true },
  { name: 'مؤسسات', nameEn: 'Enterprise', price: 'تواصل معنا', period: '', features: ['مستخدمين غير محدودين', 'كل شيء غير محدود', 'دعم مخصص 24/7', 'تخصيص كامل', 'SLA مضمون'], highlighted: false },
];

const navLinks = [
  { href: '#features', label: 'المميزات' },
  { href: '#screenshots', label: 'النظام' },
  { href: '#testimonials', label: 'آراء العملاء' },
  { href: '#pricing', label: 'الأسعار' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
];

const pageContainer = 'mx-auto w-full max-w-[1680px] px-4 sm:px-6 xl:px-10 2xl:px-12';

const SaaSLanding = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className={`${pageContainer} h-16 flex items-center justify-between`}>
          <Link to="/" className="flex items-center" aria-label="Vogantra">
            <VogantraLogo size="md" />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-6 text-sm text-muted-foreground">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="hover:text-foreground transition-colors hover:-translate-y-px">{link.label}</a>
            ))}
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="hidden sm:inline-flex">
              <Button variant="ghost" size="sm">تسجيل الدخول</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="text-xs sm:text-sm">
                ابدأ مجاناً
              </Button>
            </Link>

            {/* Mobile menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="lg:hidden p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px]">
                <div className="flex flex-col gap-4 mt-6">
                  <Link to="/" className="flex items-center mb-4" onClick={() => setMobileMenuOpen(false)} aria-label="Vogantra">
                    <VogantraLogo size="sm" />
                  </Link>
                  <nav className="flex flex-col gap-1">
                    {navLinks.map(link => (
                      <a
                        key={link.href}
                        href={link.href}
                        className="px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        {link.label}
                      </a>
                    ))}
                  </nav>
                  <div className="border-t border-border pt-4 space-y-2">
                    <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="outline" className="w-full">تسجيل الدخول</Button>
                    </Link>
                    <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>
                      <Button className="w-full">ابدأ مجاناً</Button>
                    </Link>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-12 sm:py-16 lg:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className={`${pageContainer} text-center relative z-10`}>
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-xs sm:text-sm font-medium mb-6 border border-primary/20">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            منصة SaaS متكاملة لإدارة شركات السياحة
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-4 sm:mb-6 leading-tight">
            أدِر شركة السياحة الخاصة بك
            <br className="hidden sm:block" />
            <span className="text-primary"> بكفاءة واحترافية</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
            نظام متكامل لإدارة الحجوزات، العملاء، الفواتير، والتقارير المالية. 
            سجّل شركتك الآن وابدأ في دقائق.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <Link to="/signup">
              <Button size="lg" className="w-full sm:w-auto px-6 sm:px-8 text-base shadow-lg">
                ابدأ تجربتك المجانية — 14 يوم
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </Link>
            <a href="#screenshots">
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-6 sm:px-8 text-base">
                شاهد النظام
              </Button>
            </a>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-6 sm:mt-8 text-xs sm:text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> بدون بطاقة ائتمان</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-green-500" /> تفعيل فوري</span>
            <span className="flex items-center gap-1"><Globe className="w-4 h-4 text-green-500" /> دعم عربي كامل</span>
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="py-10 sm:py-12 border-y border-border bg-muted/30">
        <div className={pageContainer}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-14 sm:py-20">
        <div className={pageContainer}>
          <div className="text-center mb-10 sm:mb-16">
            <span className="text-sm font-medium text-primary mb-2 block">المميزات</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">كل ما تحتاجه في مكان واحد</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              أدوات متكاملة لإدارة كل جوانب شركة السياحة والسفر
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {features.map((f, i) => (
              <div key={i} className="group bg-card p-5 sm:p-6 rounded-xl border border-border hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                <div className="w-11 h-11 sm:w-12 sm:h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1.5 sm:mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Screenshots */}
      <section id="screenshots" className="py-14 sm:py-20 bg-muted/50">
        <div className={pageContainer}>
          <div className="text-center mb-10 sm:mb-16">
            <span className="text-sm font-medium text-primary mb-2 block">جولة في النظام</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">شاهد النظام من الداخل</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              واجهة سهلة وبسيطة مصممة خصيصاً لشركات السياحة العربية
            </p>
          </div>
          <div className="space-y-16 sm:space-y-24">
            {detailedFeatures.map((feature, i) => (
              <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-8 sm:gap-12 items-center`}>
                <div className="flex-1 space-y-4 sm:space-y-6">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 bg-primary/10 rounded-xl flex items-center justify-center">
                    <feature.icon className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                  </div>
                  <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">{feature.desc}</p>
                  <ul className="space-y-2 sm:space-y-3">
                    {feature.points.map((point, j) => (
                      <li key={j} className="flex items-center gap-3 text-foreground text-sm sm:text-base">
                        <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-500 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/signup">
                    <Button className="mt-2 sm:mt-4">
                      جرّب الآن مجاناً
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>
                  </Link>
                </div>
                <div className="flex-1 w-full">
                  <div className="rounded-xl overflow-hidden shadow-2xl shadow-primary/10 border border-border">
                    <img src={feature.image} alt={feature.title} className="w-full h-auto" loading="lazy" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mid-page CTA */}
      <section className="py-12 sm:py-16 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,_white_0%,_transparent_60%)]" />
        <div className={`${pageContainer} text-center relative z-10`}>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary-foreground mb-3">ابدأ تجربتك المجانية اليوم</h2>
          <p className="text-primary-foreground/70 mb-6 max-w-lg mx-auto text-sm sm:text-base">
            14 يوم تجربة مجانية — بدون بطاقة ائتمان — إلغاء في أي وقت
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary" className="px-6 sm:px-8 text-base sm:text-lg font-semibold shadow-lg">
              سجّل شركتك الآن
            </Button>
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-14 sm:py-20">
        <div className={pageContainer}>
          <div className="text-center mb-10 sm:mb-16">
            <span className="text-sm font-medium text-primary mb-2 block">آراء العملاء</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">ماذا يقول عملاؤنا</h2>
            <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto">
              شركات سياحة حقيقية تثق في نظامنا لإدارة أعمالها يومياً
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-card p-5 sm:p-6 rounded-xl border border-border hover:shadow-md transition-shadow">
                <div className="flex gap-1 mb-3 sm:mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground mb-4 sm:mb-6 leading-relaxed text-sm sm:text-base">"{t.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-foreground text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-14 sm:py-20 bg-muted/50">
        <div className={pageContainer}>
          <div className="text-center mb-10 sm:mb-16">
            <span className="text-sm font-medium text-primary mb-2 block">الأسعار</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">خطط أسعار مرنة</h2>
            <p className="text-base sm:text-lg text-muted-foreground">اختر الخطة المناسبة لحجم شركتك — ابدأ مجاناً</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {plans.map((plan, i) => (
              <div 
                key={i} 
                className={`relative p-5 sm:p-6 rounded-xl border ${
                  plan.highlighted 
                    ? 'border-primary shadow-xl shadow-primary/10 ring-2 ring-primary sm:scale-105' 
                    : 'border-border'
                } bg-card`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-medium">
                    الأكثر شعبية
                  </div>
                )}
                <h3 className="text-base sm:text-lg font-semibold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">{plan.nameEn}</p>
                <div className="mt-3 sm:mt-4 mb-4 sm:mb-6">
                  <span className="text-2xl sm:text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-xs sm:text-sm text-muted-foreground"> {plan.period}</span>
                </div>
                <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2 text-xs sm:text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link to="/signup">
                  <Button 
                    className="w-full"
                    variant={plan.highlighted ? 'default' : 'outline'}
                  >
                    ابدأ الآن
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-6 sm:mt-8">
            <Link to="/pricing">
              <Button variant="link" className="text-primary text-sm sm:text-base">
                عرض المقارنة التفصيلية للخطط ←
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-14 sm:py-20">
        <div className={`${pageContainer} max-w-3xl`}>
          <div className="text-center mb-10 sm:mb-16">
            <span className="text-sm font-medium text-primary mb-2 block">الأسئلة الشائعة</span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3 sm:mb-4">أسئلة متكررة</h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              إجابات على أكثر الأسئلة شيوعاً
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-4 sm:px-6 bg-card">
                <AccordionTrigger className="text-foreground font-medium text-right hover:no-underline text-sm sm:text-base">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed text-sm">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-14 sm:py-20 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_30%,_white_0%,_transparent_60%)]" />
        <div className={`${pageContainer} text-center relative z-10`}>
          <Award className="w-12 h-12 sm:w-16 sm:h-16 text-primary-foreground/50 mx-auto mb-4 sm:mb-6" />
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary-foreground mb-3 sm:mb-4">جاهز لتطوير شركتك؟</h2>
          <p className="text-sm sm:text-lg text-primary-foreground/70 mb-6 sm:mb-8 max-w-xl mx-auto">
            انضم لمئات شركات السياحة التي تستخدم Vogantra. ابدأ تجربتك المجانية اليوم.
          </p>
          <Link to="/signup">
            <Button size="lg" variant="secondary" className="px-6 sm:px-8 text-base sm:text-lg font-semibold shadow-lg">
              ابدأ تجربتك المجانية — 14 يوم
              <ArrowLeft className="w-5 h-5 mr-2" />
            </Button>
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-5 sm:mt-6 text-xs sm:text-sm text-primary-foreground/60">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> بدون بطاقة ائتمان</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> إلغاء في أي وقت</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> دعم فني متاح</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 border-t border-border bg-muted/30">
        <div className={pageContainer}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center">
              <VogantraLogo size="sm" />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">المميزات</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">الأسعار</a>
              <a href="#faq" className="hover:text-foreground transition-colors">الأسئلة الشائعة</a>
              <Link to="/pricing" className="hover:text-foreground transition-colors">مقارنة الخطط</Link>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">© {new Date().getFullYear()} Vogantra. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SaaSLanding;
