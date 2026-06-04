import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowLeft, Rocket, MessageCircle, Star } from 'lucide-react';
import HeroDashboardMock from './HeroDashboardMock';

interface LandingHeroProps {
  onWhatsAppClick: () => void;
}

const LandingHero = ({ onWhatsAppClick }: LandingHeroProps) => {
  return (
    <section className="relative overflow-hidden bg-background pt-16 lg:pt-24 pb-24 lg:pb-32">
      {/* Grid + glows */}
      <div className="absolute inset-0 bg-grid-pattern opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
      <div className="absolute top-20 left-1/4 w-[500px] h-[500px] rounded-full bg-primary/15 blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-info/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Text side */}
          <div className="text-center lg:text-right order-2 lg:order-1">
            <Badge
              variant="secondary"
              className="mb-6 bg-primary/10 text-primary border border-primary/20 px-4 py-1.5 text-xs"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-success ml-2 animate-pulse" />
              منصة برمجية متكاملة لشركات السياحة
            </Badge>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-extrabold leading-[1.1] tracking-tight text-foreground">
              سيستم واحد
              <span className="block mt-2 text-gradient-brand">يدير شركتك بالكامل</span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
              <span className="font-semibold text-foreground">Vogantra ERP</span> — حجوزات،
              عمولات، فواتير، CRM، موردين، تقارير. منصة واحدة ذكية مصممة
              <span className="font-semibold text-foreground"> خصيصاً لشركات السياحة</span>.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3">
              <Link to="/signup">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-brand px-8 h-12 text-base">
                  <Rocket className="h-4 w-4 ml-2" />
                  احجز ديمو مجاني
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                onClick={onWhatsAppClick}
                className="border-success/40 bg-success/10 text-success hover:bg-success/15 px-8 h-12 text-base"
              >
                <MessageCircle className="h-4 w-4 ml-2" />
                تواصل واتساب
              </Button>
            </div>

            {/* Trust */}
            <div className="mt-8 flex items-center justify-center lg:justify-start gap-3">
              <div className="flex -space-x-2 rtl:space-x-reverse">
                {['hsl(var(--primary))', 'hsl(var(--info))', 'hsl(var(--success))', 'hsl(var(--warning))'].map((c, i) => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-background" style={{ background: c }} />
                ))}
              </div>
              <div className="text-right">
                <div className="flex items-center gap-0.5 text-warning">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">+500 شركة سياحة تثق بنا</div>
              </div>
            </div>
          </div>

          {/* Dashboard mock */}
          <div className="order-1 lg:order-2 relative">
            <HeroDashboardMock />
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
