import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  CheckCircle2, XCircle, ArrowLeft, Sparkles, 
  Hotel, Plane, Car, Bus, FileText, BarChart3, 
  Megaphone, Users, Headphones, Zap
} from 'lucide-react';

// All possible features with labels
const ALL_FEATURES = [
  { key: 'basic_crm', label: 'إدارة العملاء (CRM)', icon: Users },
  { key: 'hotel_bookings', label: 'حجوزات الفنادق', icon: Hotel },
  { key: 'flight_bookings', label: 'حجوزات الطيران', icon: Plane },
  { key: 'car_rentals', label: 'تأجير السيارات', icon: Car },
  { key: 'transport', label: 'النقل السياحي', icon: Bus },
  { key: 'invoices', label: 'الفواتير والمدفوعات', icon: FileText },
  { key: 'reports', label: 'التقارير والتحليلات', icon: BarChart3 },
  { key: 'marketing', label: 'التسويق والحملات', icon: Megaphone },
  { key: 'commissions', label: 'العمولات والرواتب', icon: Zap },
  { key: 'priority_support', label: 'دعم أولوية', icon: Headphones },
];

const RECOMMENDED_PLAN = 'Pro';

const PricingPage = () => {
  const [isYearly, setIsYearly] = useState(false);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['pricing-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const hasFeature = (planFeatures: string[], featureKey: string) => {
    if (planFeatures.includes('all_features')) return true;
    return planFeatures.includes(featureKey);
  };

  const formatPrice = (plan: any) => {
    const price = isYearly ? plan.price_yearly : plan.price_monthly;
    if (price === 0) return 'مجاني';
    if (plan.name === 'Enterprise') return 'تواصل معنا';
    return `${price.toLocaleString('ar-EG')}`;
  };

  const yearlyDiscount = (plan: any) => {
    if (plan.price_monthly === 0) return 0;
    const monthlyTotal = plan.price_monthly * 12;
    const yearly = plan.price_yearly;
    if (monthlyTotal === 0 || yearly === 0) return 0;
    return Math.round(((monthlyTotal - yearly) / monthlyTotal) * 100);
  };

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
      <section className="pt-16 pb-8">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm">
            <Sparkles className="w-4 h-4 ml-1 inline" />
            14 يوم تجربة مجانية على جميع الخطط
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            خطط أسعار شفافة ومرنة
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
            اختر الخطة المناسبة لحجم شركتك. جميع الخطط تتضمن فترة تجريبية مجانية لمدة 14 يوم.
          </p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mb-12">
            <span className={`text-sm font-medium ${!isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              شهري
            </span>
            <Switch checked={isYearly} onCheckedChange={setIsYearly} />
            <span className={`text-sm font-medium ${isYearly ? 'text-foreground' : 'text-muted-foreground'}`}>
              سنوي
            </span>
            {isYearly && (
              <Badge className="bg-green-100 text-green-700 border-green-200">وفّر حتى 17%</Badge>
            )}
          </div>
        </div>
      </section>

      {/* Plan Cards */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="text-center py-20 text-muted-foreground">جارٍ تحميل الخطط...</div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {plans?.map((plan) => {
                const isRecommended = plan.name === RECOMMENDED_PLAN;
                const discount = yearlyDiscount(plan);
                const features = (plan.features as string[]) || [];

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border-2 bg-card transition-all duration-200 hover:shadow-xl ${
                      isRecommended
                        ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    {isRecommended && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground px-4 py-1 text-sm shadow-md">
                          <Sparkles className="w-3 h-3 ml-1" />
                          الأكثر شعبية
                        </Badge>
                      </div>
                    )}

                    <div className="p-6 pb-4">
                      <h3 className="text-xl font-bold text-foreground">{plan.name_ar}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{plan.name}</p>

                      <div className="mt-6 mb-2">
                        <span className="text-4xl font-extrabold text-foreground">
                          {formatPrice(plan)}
                        </span>
                        {plan.price_monthly > 0 && plan.name !== 'Enterprise' && (
                          <span className="text-sm text-muted-foreground mr-1">
                            ج.م/{isYearly ? 'سنوياً' : 'شهرياً'}
                          </span>
                        )}
                      </div>

                      {isYearly && discount > 0 && (
                        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                          وفّر {discount}%
                        </Badge>
                      )}
                    </div>

                    {/* Limits */}
                    <div className="px-6 py-4 border-t border-border space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">المستخدمون</span>
                        <span className="font-semibold text-foreground">
                          {plan.max_users >= 50 ? 'غير محدود' : `حتى ${plan.max_users}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">الحجوزات/شهر</span>
                        <span className="font-semibold text-foreground">
                          {plan.max_bookings_per_month >= 9999 ? 'غير محدود' : `حتى ${plan.max_bookings_per_month}`}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">التخزين</span>
                        <span className="font-semibold text-foreground">{plan.max_storage_mb} MB</span>
                      </div>
                    </div>

                    {/* Features */}
                    <div className="px-6 py-4 border-t border-border flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        الميزات المتاحة
                      </p>
                      <ul className="space-y-2.5">
                        {ALL_FEATURES.map((feat) => {
                          const has = hasFeature(features, feat.key);
                          return (
                            <li key={feat.key} className="flex items-center gap-2 text-sm">
                              {has ? (
                                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                              ) : (
                                <XCircle className="w-4 h-4 text-muted-foreground/30 shrink-0" />
                              )}
                              <span className={has ? 'text-foreground' : 'text-muted-foreground/50 line-through'}>
                                {feat.label}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>

                    {/* CTA */}
                    <div className="p-6 pt-4 border-t border-border">
                      <Link to="/auth?tab=signup">
                        <Button
                          className={`w-full text-base ${
                            isRecommended
                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                              : ''
                          }`}
                          variant={isRecommended ? 'default' : 'outline'}
                          size="lg"
                        >
                          {plan.price_monthly === 0 ? 'ابدأ مجاناً' : 'ابدأ التجربة المجانية'}
                          <ArrowLeft className="w-4 h-4 mr-2" />
                        </Button>
                      </Link>
                      <p className="text-xs text-muted-foreground text-center mt-2">
                        بدون بطاقة ائتمان • إلغاء في أي وقت
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 bg-muted/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">مقارنة الميزات التفصيلية</h2>
          <div className="max-w-5xl mx-auto overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-right py-4 px-4 text-sm font-semibold text-muted-foreground w-1/3">الميزة</th>
                  {plans?.map((plan) => (
                    <th key={plan.id} className="py-4 px-4 text-center">
                      <div className={`text-sm font-bold ${plan.name === RECOMMENDED_PLAN ? 'text-primary' : 'text-foreground'}`}>
                        {plan.name_ar}
                      </div>
                      {plan.name === RECOMMENDED_PLAN && (
                        <Badge variant="secondary" className="mt-1 text-xs">موصى به</Badge>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Limits rows */}
                <tr className="border-b border-border bg-muted/30">
                  <td className="py-3 px-4 text-sm font-semibold text-foreground" colSpan={(plans?.length ?? 0) + 1}>
                    الحدود
                  </td>
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-sm text-muted-foreground">عدد المستخدمين</td>
                  {plans?.map((plan) => (
                    <td key={plan.id} className="py-3 px-4 text-center text-sm font-medium text-foreground">
                      {plan.max_users >= 50 ? '∞' : plan.max_users}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-sm text-muted-foreground">الحجوزات الشهرية</td>
                  {plans?.map((plan) => (
                    <td key={plan.id} className="py-3 px-4 text-center text-sm font-medium text-foreground">
                      {plan.max_bookings_per_month >= 9999 ? '∞' : plan.max_bookings_per_month}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="py-3 px-4 text-sm text-muted-foreground">مساحة التخزين</td>
                  {plans?.map((plan) => (
                    <td key={plan.id} className="py-3 px-4 text-center text-sm font-medium text-foreground">
                      {plan.max_storage_mb} MB
                    </td>
                  ))}
                </tr>

                {/* Features rows */}
                <tr className="border-b border-border bg-muted/30">
                  <td className="py-3 px-4 text-sm font-semibold text-foreground" colSpan={(plans?.length ?? 0) + 1}>
                    الميزات
                  </td>
                </tr>
                {ALL_FEATURES.map((feat) => (
                  <tr key={feat.key} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 text-sm text-foreground flex items-center gap-2">
                      <feat.icon className="w-4 h-4 text-muted-foreground" />
                      {feat.label}
                    </td>
                    {plans?.map((plan) => {
                      const features = (plan.features as string[]) || [];
                      const has = hasFeature(features, feat.key);
                      return (
                        <td key={plan.id} className="py-3 px-4 text-center">
                          {has ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <XCircle className="w-5 h-5 text-muted-foreground/20 mx-auto" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ / CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">لا تزال غير متأكد؟</h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            جرّب أي خطة مجاناً لمدة 14 يوم. بدون بطاقة ائتمان، بدون التزامات.
          </p>
          <Link to="/auth?tab=signup">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8">
              ابدأ التجربة المجانية الآن
              <ArrowLeft className="w-5 h-5 mr-2" />
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

export default PricingPage;
