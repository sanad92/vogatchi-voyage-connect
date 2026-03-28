import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, Users, Receipt, Plane, Hotel, Car, FileCheck, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

const actions = [
  {
    title: 'حجز جديد',
    icon: ClipboardList,
    href: '/bookings/new',
    gradient: 'from-primary to-primary/80',
  },
  {
    title: 'عميل جديد',
    icon: Users,
    href: '/new-customer',
    gradient: 'from-[hsl(var(--success))] to-[hsl(152,60%,35%)]',
  },
  {
    title: 'فاتورة جديدة',
    icon: Receipt,
    href: '/new-invoice',
    gradient: 'from-[hsl(var(--chart-5))] to-[hsl(270,50%,45%)]',
  },
  {
    title: 'عرض سعر',
    icon: FileCheck,
    href: '/quotes/new',
    gradient: 'from-[hsl(var(--info))] to-[hsl(205,85%,40%)]',
  },
  {
    title: 'حجز فندق',
    icon: Hotel,
    href: '/new-hotel-booking',
    gradient: 'from-[hsl(var(--warning))] to-[hsl(38,92%,40%)]',
  },
  {
    title: 'حجز طيران',
    icon: Plane,
    href: '/new-flight-booking',
    gradient: 'from-[hsl(200,90%,48%)] to-[hsl(210,80%,38%)]',
  },
];

const QuickActions = () => {
  return (
    <Card className="shadow-md border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base sm:text-lg">إجراءات سريعة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.href} to={action.href}>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-auto p-4 flex flex-col items-center gap-2.5 border-border/50",
                    "hover:border-transparent hover:text-white hover:shadow-lg transition-all duration-300",
                    `hover:bg-gradient-to-br hover:${action.gradient}`
                  )}
                >
                  <div className={cn(
                    "p-2.5 rounded-xl bg-gradient-to-br text-white",
                    action.gradient
                  )}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium">{action.title}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
