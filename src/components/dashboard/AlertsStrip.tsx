import { AlertCircle, CalendarClock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface AlertsStripProps {
  outstandingCount: number;
  checkoutsToday: number;
}

const AlertsStrip = ({ outstandingCount, checkoutsToday }: AlertsStripProps) => {
  const items = [
    outstandingCount > 0 && {
      icon: AlertCircle,
      label: `${outstandingCount} حجز يحتاج تحصيل دفعات`,
      href: '/hotel-bookings?filter=unpaid',
      tone: 'amber',
    },
    checkoutsToday > 0 && {
      icon: CalendarClock,
      label: `${checkoutsToday} حجز ينتهي اليوم`,
      href: '/hotel-bookings?filter=checkout-today',
      tone: 'sky',
    },
  ].filter(Boolean) as Array<{ icon: any; label: string; href: string; tone: string }>;

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200/70 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900/40 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex-shrink-0">
          يحتاج اهتمامك
        </span>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 flex-1">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <Link
                key={i}
                to={item.href}
                className={cn(
                  'group inline-flex items-center gap-2 text-sm font-medium transition-colors',
                  item.tone === 'amber' ? 'text-amber-800 hover:text-amber-900 dark:text-amber-300' : 'text-sky-800 hover:text-sky-900 dark:text-sky-300'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                <ArrowLeft className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AlertsStrip;
