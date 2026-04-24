import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles, ArrowLeft, ShieldCheck, Zap, Globe2,
  Hotel, Plane, Users, Receipt, BarChart3, Building2,
} from 'lucide-react';

interface LandingHeroProps {
  onWhatsAppClick: () => void;
}

const featureChips = [
  { icon: Hotel, label: 'إدارة الحجوزات' },
  { icon: Receipt, label: 'حسابات وعمولات' },
  { icon: Users, label: 'CRM وواتساب' },
  { icon: BarChart3, label: 'تقارير الأرباح' },
  { icon: Building2, label: 'فروع متعددة' },
  { icon: Plane, label: 'موردين وفنادق وطيران' },
];

const LandingHero = ({ onWhatsAppClick: _ }: LandingHeroProps) => {
  return (
    <section className="relative overflow-hidden bg-gradient-hero text-white">
      {/* Decorative grid + glow */}
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage:
          'linear-gradient(to right, rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.6) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }} />
      <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-primary/30 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-accent/20 blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10 py-20 lg:py-28">
        <div className="text-center max-w-4xl mx-auto">
          <Badge
            variant="secondary"
            className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm px-4 py-1.5 text-xs font-inter tracking-widest uppercase"
          >
            <Sparkles className="h-3 w-3 ml-1.5" />
            Powering Travel Business
          </Badge>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.15] tracking-tight">
            شغّل شركة السياحة
            <span className="block mt-2 bg-gradient-to-l from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              بذكاء واحترافية
            </span>
          </h1>

          <p className="mt-6 text-base sm:text-lg lg:text-xl text-white/75 max-w-2xl mx-auto leading-relaxed">
            <span className="font-semibold text-white">Vogantra</span> — منصة ERP واحدة لإدارة الحجوزات،
            الحسابات، الموردين، الـ CRM، والتقارير. كل شركة سياحتك في مكان واحد.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/signup">
              <Button
                size="lg"
                className="bg-gradient-to-r from-primary to-accent text-white hover:opacity-95 shadow-[0_10px_40px_-10px_hsl(199_89%_48%/0.6)] px-8 h-12 text-base"
              >
                ابدأ تجربة مجانية 14 يوم
                <ArrowLeft className="h-4 w-4 mr-2" />
              </Button>
            </Link>
            <Link to="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 bg-white/5 text-white hover:bg-white/10 px-8 h-12 text-base backdrop-blur-sm"
              >
                شاهد الأسعار
              </Button>
            </Link>
          </div>

          <p className="mt-4 text-xs text-white/50 font-inter">
            بدون بطاقة ائتمان · إعداد في دقائق · دعم عربي
          </p>

          {/* Feature chips */}
          <div className="mt-12 flex flex-wrap justify-center gap-2.5">
            {featureChips.map((chip, i) => {
              const Icon = chip.icon;
              return (
                <div
                  key={i}
                  className="flex items-center gap-2 bg-white/8 border border-white/15 backdrop-blur-sm rounded-full px-4 py-2 text-sm text-white/85 hover:bg-white/12 transition"
                >
                  <Icon className="h-3.5 w-3.5 text-primary-glow" />
                  {chip.label}
                </div>
              );
            })}
          </div>

          {/* Trust pills */}
          <div className="mt-10 flex flex-wrap justify-center items-center gap-x-8 gap-y-3 text-xs text-white/60">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-accent" />
              عزل بيانات كامل (RLS)
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-accent" />
              أداء فوري
            </div>
            <div className="flex items-center gap-1.5">
              <Globe2 className="h-4 w-4 text-accent" />
              متعدد العملات والفروع
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
