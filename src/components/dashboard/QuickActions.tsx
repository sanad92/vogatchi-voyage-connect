
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar, Users, MessageSquare, FileText, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';

const QuickActions = () => {
  const actions = [
    {
      title: 'حجز جديد',
      icon: Plus,
      href: '/bookings',
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'إضافة حجز جديد'
    },
    {
      title: 'عميل جديد',
      icon: Users,
      href: '/customers',
      color: 'bg-green-600 hover:bg-green-700',
      description: 'تسجيل عميل جديد'
    },
    {
      title: 'فاتورة جديدة',
      icon: Receipt,
      href: '/invoices',
      color: 'bg-purple-600 hover:bg-purple-700',
      description: 'إنشاء فاتورة'
    },
    {
      title: 'متابعة العملاء',
      icon: MessageSquare,
      href: '/customer-service',
      color: 'bg-orange-600 hover:bg-orange-700',
      description: 'خدمة العملاء'
    },
    {
      title: 'التقارير',
      icon: FileText,
      href: '/reports',
      color: 'bg-red-600 hover:bg-red-700',
      description: 'عرض التقارير'
    },
    {
      title: 'التقويم',
      icon: Calendar,
      href: '/bookings',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      description: 'عرض الحجوزات'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">العمليات السريعة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} to={action.href}>
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
