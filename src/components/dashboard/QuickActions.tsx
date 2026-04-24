import { ClipboardList, Users, Receipt, Plane, Hotel, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const actions = [
  { title: 'حجز جديد', icon: ClipboardList, href: '/bookings/new' },
  { title: 'عميل جديد', icon: Users, href: '/new-customer' },
  { title: 'فاتورة', icon: Receipt, href: '/new-invoice' },
  { title: 'عرض سعر', icon: FileCheck, href: '/quotes/new' },
  { title: 'حجز فندق', icon: Hotel, href: '/new-hotel-booking' },
  { title: 'حجز طيران', icon: Plane, href: '/new-flight-booking' },
];

const QuickActions = () => {
  return (
    <div className="bg-card rounded-2xl border border-border/60 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-foreground">إجراءات سريعة</h3>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              to={action.href}
              className="group flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted/60 transition-colors"
            >
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-[11px] sm:text-xs font-medium text-foreground text-center leading-tight">
                {action.title}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
