import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Hotel,
  Users,
  Plane,
  Receipt,
  MessageSquare,
  Calendar,
  FileText,
  Building2,
  RefreshCw,
  Truck,
  Calculator,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';

type Priority = 'high' | 'medium' | 'low';

type QuickAction = {
  title: string;
  icon: typeof Hotel;
  href: string;
  color: string;
  description: string;
  priority: Priority;
};

const QuickActions = () => {
  const actions: QuickAction[] = [
    {
      title: '\u062d\u062c\u0632 \u0641\u0646\u062f\u0642 \u062c\u062f\u064a\u062f',
      icon: Hotel,
      href: '/new-hotel-booking',
      color: 'bg-blue-600 hover:bg-blue-700',
      description: '\u0625\u0636\u0627\u0641\u0629 \u062d\u062c\u0632 \u0641\u0646\u062f\u0642 \u062c\u062f\u064a\u062f',
      priority: 'high',
    },
    {
      title: '\u0639\u0645\u064a\u0644 \u062c\u062f\u064a\u062f',
      icon: Users,
      href: '/new-customer',
      color: 'bg-green-600 hover:bg-green-700',
      description: '\u062a\u0633\u062c\u064a\u0644 \u0639\u0645\u064a\u0644 \u062c\u062f\u064a\u062f',
      priority: 'high',
    },
    {
      title: '\u062d\u062c\u0632 \u0637\u064a\u0631\u0627\u0646 \u062c\u062f\u064a\u062f',
      icon: Plane,
      href: '/new-flight-booking',
      color: 'bg-sky-600 hover:bg-sky-700',
      description: '\u0625\u0636\u0627\u0641\u0629 \u062d\u062c\u0632 \u0637\u064a\u0631\u0627\u0646',
      priority: 'high',
    },
    {
      title: '\u0641\u0627\u062a\u0648\u0631\u0629 \u062c\u062f\u064a\u062f\u0629',
      icon: Receipt,
      href: '/new-invoice',
      color: 'bg-purple-600 hover:bg-purple-700',
      description: '\u0625\u0646\u0634\u0627\u0621 \u0641\u0627\u062a\u0648\u0631\u0629 \u062c\u062f\u064a\u062f\u0629',
      priority: 'high',
    },
    {
      title: '\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621',
      icon: MessageSquare,
      href: '/customer-service',
      color: 'bg-orange-600 hover:bg-orange-700',
      description: '\u062e\u062f\u0645\u0629 \u0648\u0645\u062a\u0627\u0628\u0639\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621',
      priority: 'medium',
    },
    {
      title: '\u062a\u0642\u0631\u064a\u0631 \u0627\u0644\u0623\u0631\u0628\u0627\u062d \u0648\u0627\u0644\u062e\u0633\u0627\u0626\u0631',
      icon: TrendingUp,
      href: '/profit-loss-reports',
      color: 'bg-emerald-600 hover:bg-emerald-700',
      description: '\u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0648\u0636\u0639 \u0627\u0644\u0645\u0627\u0644\u064a',
      priority: 'medium',
    },
    {
      title: '\u062a\u0642\u0648\u064a\u0645 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a',
      icon: Calendar,
      href: '/bookings-calendar',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      description: '\u0639\u0631\u0636 \u062c\u062f\u0648\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a',
      priority: 'medium',
    },
    {
      title: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621',
      icon: Users,
      href: '/customers',
      color: 'bg-teal-600 hover:bg-teal-700',
      description: '\u0639\u0631\u0636 \u0648\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0639\u0645\u0644\u0627\u0621',
      priority: 'medium',
    },
    {
      title: '\u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631',
      icon: FileText,
      href: '/reports',
      color: 'bg-red-600 hover:bg-red-700',
      description: '\u0639\u0631\u0636 \u0627\u0644\u062a\u0642\u0627\u0631\u064a\u0631 \u0648\u0627\u0644\u0625\u062d\u0635\u0627\u0626\u064a\u0627\u062a',
      priority: 'low',
    },
    {
      title: '\u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0628\u0646\u0643\u064a\u0629',
      icon: Building2,
      href: '/bank-accounts',
      color: 'bg-slate-600 hover:bg-slate-700',
      description: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u0633\u0627\u0628\u0627\u062a \u0627\u0644\u0628\u0646\u0643\u064a\u0629',
      priority: 'low',
    },
    {
      title: '\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0635\u0631\u0641',
      icon: RefreshCw,
      href: '/bank-accounts?tab=exchange-rates',
      color: 'bg-amber-600 hover:bg-amber-700',
      description: '\u062a\u062d\u062f\u064a\u062b \u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0635\u0631\u0641',
      priority: 'low',
    },
    {
      title: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a',
      icon: Calculator,
      href: '/expense-management',
      color: 'bg-rose-600 hover:bg-rose-700',
      description: '\u062a\u062a\u0628\u0639 \u0648\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0645\u0635\u0631\u0648\u0641\u0627\u062a',
      priority: 'low',
    },
  ];

  const sortedActions = useMemo(() => {
    const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 };
    return [...actions].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }, [actions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">{'\u0627\u0644\u0639\u0645\u0644\u064a\u0627\u062a \u0627\u0644\u0633\u0631\u064a\u0639\u0629'}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {sortedActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title + action.href} to={action.href}>
                <Button
                  variant="outline"
                  className={`w-full h-auto p-3 sm:p-4 flex flex-col items-center gap-2 hover:shadow-md transition-all ${action.color} hover:text-white group border-gray-200`}
                >
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6 group-hover:text-white" />
                  <div className="text-center">
                    <p className="text-xs sm:text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-gray-500 group-hover:text-gray-200 hidden sm:block">{action.description}</p>
                  </div>
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
