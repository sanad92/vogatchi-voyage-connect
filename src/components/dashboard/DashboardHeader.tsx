import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Sun, Sunrise, Moon } from 'lucide-react';

const DashboardHeader = () => {
  const { profile } = useOptimizedAuth();
  const firstName = profile?.full_name?.split(' ')[0] || 'المستخدم';

  const hour = new Date().getHours();
  const period =
    hour < 12
      ? { label: 'صباح الخير', Icon: Sunrise, tone: 'from-amber-400/20 to-orange-500/10 text-amber-500' }
      : hour < 17
      ? { label: 'مساء الخير', Icon: Sun, tone: 'from-sky-400/20 to-blue-500/10 text-sky-500' }
      : { label: 'مساء الخير', Icon: Moon, tone: 'from-indigo-400/20 to-violet-500/10 text-indigo-400' };

  const dateLabel = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card p-6 sm:p-8 animate-in fade-in">
      {/* Decorative gradient orb */}
      <div
        aria-hidden
        className="absolute -top-24 -end-24 h-64 w-64 rounded-full opacity-40 blur-3xl"
        style={{ background: 'var(--gradient-brand)' }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-dot-pattern opacity-[0.15] pointer-events-none"
      />

      <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`hidden sm:flex h-14 w-14 rounded-2xl bg-gradient-to-br items-center justify-center ring-1 ring-border/40 ${period.tone}`}
          >
            <period.Icon className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-primary uppercase tracking-[0.16em] mb-1">
              نظرة عامة
            </p>
            <h1 className="text-2xl sm:text-[30px] font-bold text-foreground tracking-tight leading-tight">
              {period.label}، <span className="text-gradient-brand">{firstName}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{dateLabel}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
