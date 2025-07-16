
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
  CreditCard,
  Truck,
  Calculator,
  TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

const QuickActions = () => {
  const actions = [
    // العمليات الأساسية (الأولوية العالية)
    {
      title: 'حجز فندق جديد',
      icon: Hotel,
      href: '/new-hotel-booking',
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'إضافة حجز فندق جديد',
      priority: 'high'
    },
    {
      title: 'عميل جديد',
      icon: Users,
      href: '/new-customer',
      color: 'bg-green-600 hover:bg-green-700',
      description: 'تسجيل عميل جديد',
      priority: 'high'
    },
    {
      title: 'حجز طيران جديد',
      icon: Plane,
      href: '/new-flight-booking',
      color: 'bg-sky-600 hover:bg-sky-700',
      description: 'إضافة حجز طيران',
      priority: 'high'
    },
    {
      title: 'فاتورة جديدة',
      icon: Receipt,
      href: '/new-invoice',
      color: 'bg-purple-600 hover:bg-purple-700',
      description: 'إنشاء فاتورة جديدة',
      priority: 'high'
    },

    // عمليات الإدارة والمتابعة
    {
      title: 'متابعة العملاء',
      icon: MessageSquare,
      href: '/customer-service',
      color: 'bg-orange-600 hover:bg-orange-700',
      description: 'خدمة ومتابعة العملاء',
      priority: 'medium'
    },
    {
      title: 'تقرير الأرباح والخسائر',
      icon: TrendingUp,
      href: '/profit-loss-reports',
      color: 'bg-emerald-600 hover:bg-emerald-700',
      description: 'تحليل الوضع المالي',
      priority: 'medium'
    },
    {
      title: 'تقويم الحجوزات',
      icon: Calendar,
      href: '/bookings-calendar',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      description: 'عرض جدول الحجوزات',
      priority: 'medium'
    },
    {
      title: 'إدارة العملاء',
      icon: Users,
      href: '/customers',
      color: 'bg-teal-600 hover:bg-teal-700',
      description: 'عرض وإدارة العملاء',
      priority: 'medium'
    },

    // العمليات المالية والإدارية
    {
      title: 'التقارير',
      icon: FileText,
      href: '/reports',
      color: 'bg-red-600 hover:bg-red-700',
      description: 'عرض التقارير والإحصائيات',
      priority: 'low'
    },
    {
      title: 'الحسابات البنكية',
      icon: Building2,
      href: '/bank-accounts',
      color: 'bg-slate-600 hover:bg-slate-700',
      description: 'إدارة الحسابات البنكية',
      priority: 'low'
    },
    {
      title: 'أسعار الصرف',
      icon: RefreshCw,
      href: '/bank-accounts?tab=exchange-rates',
      color: 'bg-amber-600 hover:bg-amber-700',
      description: 'تحديث أسعار الصرف',
      priority: 'low'
    },
    {
      title: 'إدارة المصروفات',
      icon: Calculator,
      href: '/expense-management',
      color: 'bg-rose-600 hover:bg-rose-700',
      description: 'تتبع وإدارة المصروفات',
      priority: 'low'
    }
  ];

  // ترتيب العمليات حسب الأولوية
  const sortedActions = actions.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">العمليات السريعة</CardTitle>
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
                    <p className="text-xs text-gray-500 group-hover:text-gray-200 hidden sm:block">
                      {action.description}
                    </p>
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
