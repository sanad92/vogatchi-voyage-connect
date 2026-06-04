import { TrendingUp, Users, Plane, Hotel, ArrowUpRight, CheckCircle2 } from 'lucide-react';

/**
 * Hero dashboard mockup — a faux Vogantra control panel preview.
 * Pure presentational; mirrors a real travel-ops dashboard.
 */
const HeroDashboardMock = () => {
  const bars = [62, 78, 54, 88, 72, 95, 68];

  return (
    <div className="relative" dir="ltr">
      {/* Floating top-left chip */}
      <div className="absolute -top-6 -left-4 z-20 bg-card border border-border rounded-xl shadow-lg px-3.5 py-2.5 flex items-center gap-2.5 animate-fade-in">
        <div className="w-9 h-9 rounded-lg bg-success/15 flex items-center justify-center">
          <TrendingUp className="h-4 w-4 text-success" />
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground leading-none">نمو الأرباح</div>
          <div className="text-sm font-bold text-foreground font-mono mt-0.5">+34.8%</div>
        </div>
      </div>

      {/* Floating bottom-right chip */}
      <div className="absolute -bottom-5 -right-4 z-20 bg-card border border-border rounded-xl shadow-lg px-3.5 py-2.5 flex items-center gap-2.5 animate-fade-in">
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
          <Users className="h-4 w-4 text-primary" />
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground leading-none">مستخدم نشط الآن</div>
          <div className="text-sm font-bold text-foreground font-mono mt-0.5">1,284</div>
        </div>
      </div>

      {/* Sync badge top-right */}
      <div className="absolute -top-3 right-8 z-20 bg-card/95 backdrop-blur-sm border border-border rounded-full shadow-md px-3 py-1.5 flex items-center gap-1.5 animate-fade-in">
        <CheckCircle2 className="h-3 w-3 text-success" />
        <span className="text-[10px] text-foreground">تمت مزامنة البيانات</span>
      </div>

      {/* Main panel */}
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Title bar */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-warning/70" />
            <div className="w-2.5 h-2.5 rounded-full bg-success/70" />
          </div>
          <div className="text-[10px] text-muted-foreground font-mono">Vogantra ERP — Dashboard</div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-2.5 p-3" dir="rtl">
          {[
            { label: 'الحجوزات', value: '٨٧٦', delta: '+24%', color: 'primary' },
            { label: 'العملاء', value: '٣,٢٤٠', delta: '+9%', color: 'success' },
            { label: 'الإيرادات', value: '١٢٤,٥٠٠', delta: '+18%', color: 'info' },
          ].map((kpi, i) => (
            <div key={i} className="bg-muted/40 border border-border/60 rounded-lg p-2.5">
              <div className="text-[10px] text-muted-foreground">{kpi.label}</div>
              <div className="text-base font-bold text-foreground font-mono mt-1">{kpi.value}</div>
              <div className={`inline-flex items-center gap-0.5 mt-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded bg-${kpi.color}/15 text-${kpi.color}`}>
                <ArrowUpRight className="h-2.5 w-2.5" />
                {kpi.delta}
              </div>
            </div>
          ))}
        </div>

        {/* Chart + ring */}
        <div className="grid grid-cols-5 gap-2.5 px-3 pb-3" dir="rtl">
          {/* Ring */}
          <div className="col-span-2 bg-muted/40 border border-border/60 rounded-lg p-3 flex flex-col items-center justify-center">
            <div className="relative w-20 h-20">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="hsl(var(--primary))" strokeWidth="3" strokeDasharray="72, 100" strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-base font-bold text-foreground font-mono">72%</span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground mt-2">نسبة الإنجاز</div>
          </div>

          {/* Bars */}
          <div className="col-span-3 bg-muted/40 border border-border/60 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground">آخر 7 أشهر</span>
              <span className="text-[10px] text-foreground font-semibold">تحليل المبيعات</span>
            </div>
            <div className="flex items-end justify-between gap-1.5 h-16">
              {bars.map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t bg-gradient-to-t from-primary/60 to-primary"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer row — recent bookings */}
        <div className="border-t border-border bg-muted/20 px-3 py-2.5 space-y-1.5" dir="rtl">
          {[
            { icon: Hotel, label: 'حجز فندق — القاهرة', amount: '٤,٢٠٠', status: 'مؤكد' },
            { icon: Plane, label: 'تذكرة طيران — جدة', amount: '٢,٨٥٠', status: 'مدفوع' },
          ].map((row, i) => {
            const Icon = row.icon;
            return (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                    <Icon className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-foreground">{row.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-foreground">{row.amount}</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-success/15 text-success">{row.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default HeroDashboardMock;
