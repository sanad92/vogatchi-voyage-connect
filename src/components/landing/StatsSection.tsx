import { Heart, Activity, Package, Users } from 'lucide-react';

const stats = [
  { icon: Heart, value: '99%', label: 'نسبة رضا العملاء', color: 'text-destructive' },
  { icon: Activity, value: '50K+', label: 'حجز شهري', color: 'text-success' },
  { icon: Package, value: '500+', label: 'شركة سياحة', color: 'text-primary' },
  { icon: Users, value: '99.9%', label: 'وقت تشغيل النظام', color: 'text-info' },
];

const StatsSection = () => {
  return (
    <section className="py-16 lg:py-20 bg-background">
      <div className="mx-auto w-full max-w-[1280px] px-4 sm:px-6 lg:px-10">
        <div className="surface-elevated rounded-2xl border border-border p-8 lg:p-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mb-4">
                    <Icon className={`h-6 w-6 ${s.color}`} />
                  </div>
                  <div className="text-3xl lg:text-4xl font-bold text-foreground font-mono tracking-tight">
                    {s.value}
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">{s.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
