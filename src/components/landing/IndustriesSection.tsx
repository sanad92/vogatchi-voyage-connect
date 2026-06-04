import { Plane, Hotel, MapPin, Briefcase, Globe, Ship } from 'lucide-react';

const industries = [
  { icon: Plane, name: 'وكلاء الطيران', desc: 'إدارة تذاكر، تعديلات، استرداد، وعمولات IATA لحظية.' },
  { icon: Hotel, name: 'حجوزات الفنادق', desc: 'تعاقدات مباشرة، Allotments، تسعير ديناميكي، voucher تلقائي.' },
  { icon: MapPin, name: 'الرحلات والباقات', desc: 'باني رحلات احترافي، عروض أسعار PDF، تحويل سريع لحجز.' },
  { icon: Briefcase, name: 'سياحة الأعمال', desc: 'حسابات شركات، فواتير شهرية، تقارير ضريبية، حدود ائتمان.' },
  { icon: Globe, name: 'العمرة والحج', desc: 'باقات، تأشيرات، تجمعات مجموعات، متابعة كل حاج بالتفصيل.' },
  { icon: Ship, name: 'الكروز والسفاري', desc: 'حجوزات معقدة متعددة الخدمات، موردين دوليين، عملات متعددة.' },
];

const IndustriesSection = () => {
  return (
    <section className="py-20 lg:py-28 bg-background border-t border-border">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="text-center mb-14 max-w-2xl mx-auto">
          <p className="text-xs font-inter font-semibold uppercase tracking-[0.2em] text-primary mb-3">
            القطاعات التي نخدمها
          </p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground tracking-tight">
            متخصصون في السياحة. فقط.
          </h2>
          <p className="mt-4 text-muted-foreground text-base sm:text-lg leading-relaxed">
            بدل سيستم عام يخدم كل المجالات بسطحية — Vogantra مبني من الأساس لشركات السياحة.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {industries.map((ind, i) => {
            const Icon = ind.icon;
            return (
              <div
                key={i}
                className="surface-card rounded-xl p-6 hover:border-primary/40 hover-lift group"
              >
                <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">{ind.name}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{ind.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default IndustriesSection;
