
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Plane, Hotel, Car, Users, BarChart3, Shield, 
  CheckCircle2, ArrowLeft, Globe, Zap, Clock,
  Star, MessageSquare, TrendingUp, FileText, CreditCard,
  Headphones, ChevronDown, Award, Target, Layers
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
  {
    name: 'أحمد محمود',
    role: 'مدير شركة الفارس للسياحة',
    content: 'النظام وفّر علينا ساعات من العمل اليومي. أصبحنا نتابع كل شيء من مكان واحد بدل عشرات الملفات.',
    rating: 5,
    avatar: 'أ',
  },
  {
    name: 'سارة عبدالله',
    role: 'مديرة حجوزات — رحلات الخليج',
    content: 'أفضل ميزة هي التقارير المالية التلقائية. أصبح بإمكاننا معرفة أرباحنا لحظياً دون حسابات يدوية.',
    rating: 5,
    avatar: 'س',
  },
  {
    name: 'محمد الشريف',
    role: 'مؤسس ترافل برو',
    content: 'جربنا عدة أنظمة من قبل، لكن هذا النظام الأول الذي يفهم احتياجات شركات السياحة العربية فعلاً.',
    rating: 5,
    avatar: 'م',
  },
  {
    name: 'فاطمة حسن',
    role: 'مديرة عمليات — نسمة تورز',
    content: 'سهولة الاستخدام مذهلة. فريقنا بالكامل تعلم النظام في يوم واحد وبدأنا العمل فوراً.',
    rating: 5,
    avatar: 'ف',
  },
];

const stats = [
  { value: '+500', label: 'شركة سياحة' },
  { value: '+50,000', label: 'حجز شهرياً' },
  { value: '99.9%', label: 'وقت التشغيل' },
  { value: '+95%', label: 'رضا العملاء' },
];

const faqs = [
  {
    q: 'هل يمكنني تجربة النظام مجاناً؟',
    a: 'نعم! نوفر فترة تجريبية مجانية لمدة 14 يوماً مع جميع المميزات. لا نحتاج بطاقة ائتمان للتسجيل.',
  },
  {
    q: 'هل بيانات شركتي آمنة؟',
    a: 'بالتأكيد. نستخدم أعلى معايير الأمان مع عزل كامل لبيانات كل شركة. بياناتك مشفرة ومحمية بالكامل.',
  },
  {
    q: 'هل يدعم النظام اللغة العربية بالكامل؟',
    a: 'نعم، النظام مصمم بالكامل باللغة العربية مع واجهة RTL احترافية. كل القوائم والتقارير والفواتير باللغة العربية.',
  },
  {
    q: 'هل يمكنني ترقية أو تغيير خطتي لاحقاً؟',
    a: 'بالطبع! يمكنك الترقية أو التخفيض في أي وقت. يتم احتساب الفرق بشكل نسبي.',
  },
  {
    q: 'كم يستغرق إعداد النظام؟',
    a: 'التسجيل والإعداد يستغرق أقل من 5 دقائق. يمكنك البدء في إضافة الحجوزات والعملاء فوراً بعد التسجيل.',
  },
  {
    q: 'هل يوجد دعم فني؟',
    a: 'نعم، نوفر دعماً فنياً عبر البريد الإلكتروني والواتساب. الخطط الاحترافية تشمل دعم أولوية.',
  },
];

const plans = [
  { 
    name: 'مجاني', nameEn: 'Free', price: '0', period: '/شهرياً',
    features: ['5 مستخدمين', '100 حجز شهرياً', '500 عميل', 'تقارير أساسية'],
    highlighted: false 
  },
  { 
    name: 'أساسي', nameEn: 'Basic', price: '299', period: 'ج.م/شهرياً',
    features: ['15 مستخدم', '500 حجز شهرياً', '2000 عميل', 'تقارير متقدمة', 'دعم بريد إلكتروني'],
    highlighted: false 
  },
  { 
    name: 'احترافي', nameEn: 'Pro', price: '599', period: 'ج.م/شهرياً',
    features: ['50 مستخدم', 'حجوزات غير محدودة', 'عملاء غير محدودين', 'تقارير مخصصة', 'دعم أولوية', 'API وصول'],
    highlighted: true 
  },
  { 
    name: 'مؤسسات', nameEn: 'Enterprise', price: 'تواصل معنا', period: '',
    features: ['مستخدمين غير محدودين', 'كل شيء غير محدود', 'دعم مخصص 24/7', 'تخصيص كامل', 'SLA مضمون'],
    highlighted: false 
  },
];

const SaaSLanding = () => {
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Vogatchi CRM
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">المميزات</a>
            <a href="#screenshots" className="hover:text-foreground transition-colors">النظام</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">آراء العملاء</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">الأسعار</a>
            <a href="#faq" className="hover:text-foreground transition-colors">الأسئلة الشائعة</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">تسجيل الدخول</Button>
            </Link>
            <Link to="/auth?tab=signup">
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                ابدأ مجاناً
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium mb-6 border border-blue-200 dark:border-blue-800">
            <Zap className="w-4 h-4" />
            منصة SaaS متكاملة لإدارة شركات السياحة
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
            أدِر شركة السياحة الخاصة بك
            <br />
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              بكفاءة واحترافية
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            نظام متكامل لإدارة الحجوزات، العملاء، الفواتير، والتقارير المالية. 
            سجّل شركتك الآن وابدأ في دقائق.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 text-lg shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-shadow">
                ابدأ تجربتك المجانية — 14 يوم
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </Link>
            <a href="#screenshots">
              <Button size="lg" variant="outline" className="px-8 text-lg">
                شاهد النظام
              </Button>
            </a>
          </div>
          <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-green-500" /> بدون بطاقة ائتمان</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4 text-green-500" /> تفعيل فوري</span>
            <span className="flex items-center gap-1"><Globe className="w-4 h-4 text-green-500" /> دعم عربي كامل</span>
          </div>
        </div>
      </section>

      {/* Social Proof Stats */}
      <section className="py-12 border-y border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 block">المميزات</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">كل ما تحتاجه في مكان واحد</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              أدوات متكاملة لإدارة كل جوانب شركة السياحة والسفر
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="group bg-card p-6 rounded-xl border border-border hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950/50 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <f.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product Screenshots - Detailed Features */}
      <section id="screenshots" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 block">جولة في النظام</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">شاهد النظام من الداخل</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              واجهة سهلة وبسيطة مصممة خصيصاً لشركات السياحة العربية
            </p>
          </div>
          <div className="space-y-24">
            {detailedFeatures.map((feature, i) => (
              <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} gap-12 items-center`}>
                <div className="flex-1 space-y-6">
                  <div className="w-14 h-14 bg-blue-100 dark:bg-blue-950/50 rounded-xl flex items-center justify-center">
                    <feature.icon className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground">{feature.title}</h3>
                  <p className="text-muted-foreground text-lg leading-relaxed">{feature.desc}</p>
                  <ul className="space-y-3">
                    {feature.points.map((point, j) => (
                      <li key={j} className="flex items-center gap-3 text-foreground">
                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth?tab=signup">
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white mt-4">
                      جرّب الآن مجاناً
                      <ArrowLeft className="w-4 h-4 mr-2" />
                    </Button>
                  </Link>
                </div>
                <div className="flex-1">
                  <div className="rounded-xl overflow-hidden shadow-2xl shadow-blue-500/10 border border-border">
                    <img 
                      src={feature.image} 
                      alt={feature.title} 
                      className="w-full h-auto" 
                      loading="lazy" 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mid-page CTA */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiLz48L3N2Zz4=')] opacity-50" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">ابدأ تجربتك المجانية اليوم</h2>
          <p className="text-blue-100 mb-6 max-w-lg mx-auto">
            14 يوم تجربة مجانية — بدون بطاقة ائتمان — إلغاء في أي وقت
          </p>
          <Link to="/auth?tab=signup">
            <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 px-8 text-lg font-semibold shadow-lg">
              سجّل شركتك الآن
            </Button>
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 block">آراء العملاء</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">ماذا يقول عملاؤنا</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              شركات سياحة حقيقية تثق في نظامنا لإدارة أعمالها يومياً
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-card p-6 rounded-xl border border-border hover:shadow-md transition-shadow">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-foreground mb-6 leading-relaxed">"{t.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
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
      <section id="pricing" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 block">الأسعار</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">خطط أسعار مرنة</h2>
            <p className="text-lg text-muted-foreground">اختر الخطة المناسبة لحجم شركتك — ابدأ مجاناً</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, i) => (
              <div 
                key={i} 
                className={`relative p-6 rounded-xl border ${
                  plan.highlighted 
                    ? 'border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500 scale-105' 
                    : 'border-border'
                } bg-card`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                    الأكثر شعبية
                  </div>
                )}
                <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground">{plan.nameEn}</p>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-sm text-muted-foreground"> {plan.period}</span>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feat, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      {feat}
                    </li>
                  ))}
                </ul>
                <Link to="/auth?tab=signup">
                  <Button 
                    className={`w-full ${plan.highlighted ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : ''}`}
                    variant={plan.highlighted ? 'default' : 'outline'}
                  >
                    ابدأ الآن
                  </Button>
                </Link>
              </div>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/pricing">
              <Button variant="link" className="text-primary text-base">
                عرض المقارنة التفصيلية للخطط ←
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2 block">الأسئلة الشائعة</span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">أسئلة متكررة</h2>
            <p className="text-lg text-muted-foreground">
              إجابات على أكثر الأسئلة شيوعاً
            </p>
          </div>
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="border border-border rounded-xl px-6 bg-card">
                <AccordionTrigger className="text-foreground font-medium text-right hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIyMCIgY3k9IjIwIiByPSIxIiBmaWxsPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMDgpIi8+PC9zdmc+')] opacity-50" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <Award className="w-16 h-16 text-blue-200 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">جاهز لتطوير شركتك؟</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
            انضم لمئات شركات السياحة التي تستخدم Vogatchi CRM. ابدأ تجربتك المجانية اليوم.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/auth?tab=signup">
              <Button size="lg" className="bg-white text-blue-700 hover:bg-blue-50 px-8 text-lg font-semibold shadow-lg">
                ابدأ تجربتك المجانية — 14 يوم
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-sm text-blue-200">
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> بدون بطاقة ائتمان</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> إلغاء في أي وقت</span>
            <span className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> دعم فني متاح</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
              <span className="font-semibold text-foreground">Vogatchi CRM</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#features" className="hover:text-foreground transition-colors">المميزات</a>
              <a href="#pricing" className="hover:text-foreground transition-colors">الأسعار</a>
              <a href="#faq" className="hover:text-foreground transition-colors">الأسئلة الشائعة</a>
              <Link to="/pricing" className="hover:text-foreground transition-colors">مقارنة الخطط</Link>
            </div>
            <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Vogatchi CRM. جميع الحقوق محفوظة.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SaaSLanding;
