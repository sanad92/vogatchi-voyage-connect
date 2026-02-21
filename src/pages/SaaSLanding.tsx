
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Plane, Hotel, Car, Users, BarChart3, Shield, 
  CheckCircle2, ArrowLeft, Globe, Zap, Clock 
} from 'lucide-react';

const features = [
  { icon: Hotel, title: 'حجوزات الفنادق', desc: 'إدارة حجوزات الفنادق مع تتبع التكاليف والأرباح' },
  { icon: Plane, title: 'حجوزات الطيران', desc: 'تتبع رحلات الطيران وتذاكر الركاب' },
  { icon: Car, title: 'تأجير السيارات', desc: 'إدارة عقود الإيجار والمركبات' },
  { icon: Users, title: 'إدارة العملاء', desc: 'قاعدة بيانات عملاء متكاملة مع CRM' },
  { icon: BarChart3, title: 'تقارير وتحليلات', desc: 'تقارير مالية وتحليلات أداء مفصلة' },
  { icon: Shield, title: 'أمان متقدم', desc: 'عزل كامل للبيانات بين الشركات' },
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
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            منصة SaaS لإدارة شركات السياحة
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
              <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 text-lg">
                ابدأ مجاناً الآن
                <ArrowLeft className="w-5 h-5 mr-2" />
              </Button>
            </Link>
            <a href="#features">
              <Button size="lg" variant="outline" className="px-8 text-lg">
                اكتشف المميزات
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

      {/* Features */}
      <section id="features" className="py-20 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">كل ما تحتاجه في مكان واحد</h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              أدوات متكاملة لإدارة كل جوانب شركة السياحة والسفر
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={i} className="bg-card p-6 rounded-xl border border-border hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">خطط أسعار مرنة</h2>
            <p className="text-lg text-muted-foreground">اختر الخطة المناسبة لحجم شركتك</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {plans.map((plan, i) => (
              <div 
                key={i} 
                className={`relative p-6 rounded-xl border ${
                  plan.highlighted 
                    ? 'border-blue-500 shadow-xl shadow-blue-500/10 ring-2 ring-blue-500' 
                    : 'border-border'
                } bg-card`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full">
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
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">جاهز لتطوير شركتك؟</h2>
          <p className="text-lg text-blue-100 mb-8 max-w-xl mx-auto">
            انضم لعشرات شركات السياحة التي تستخدم Vogatchi CRM لإدارة أعمالها بكفاءة
          </p>
          <Link to="/auth?tab=signup">
            <Button size="lg" variant="secondary" className="px-8 text-lg">
              سجّل شركتك الآن مجاناً
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Vogatchi CRM. جميع الحقوق محفوظة.</p>
        </div>
      </footer>
    </div>
  );
};

export default SaaSLanding;
