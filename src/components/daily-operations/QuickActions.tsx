
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, MessageSquare, Users, Hotel, Plane, FileText, Phone } from "lucide-react";
import { Link } from "react-router-dom";

const QuickActions = () => {
  const actions = [
    {
      title: 'حجز فندق جديد',
      icon: Hotel,
      href: '/new-hotel-booking',
      color: 'bg-blue-600 hover:bg-blue-700',
      description: 'إضافة حجز فندق'
    },
    {
      title: 'حجز طيران جديد',
      icon: Plane,
      href: '/flight-bookings',
      color: 'bg-sky-600 hover:bg-sky-700',
      description: 'إضافة حجز طيران'
    },
    {
      title: 'عميل جديد',
      icon: Users,
      href: '/new-customer',
      color: 'bg-green-600 hover:bg-green-700',
      description: 'تسجيل عميل جديد'
    },
    {
      title: 'تقويم الحجوزات',
      icon: Calendar,
      href: '/bookings-calendar',
      color: 'bg-indigo-600 hover:bg-indigo-700',
      description: 'عرض التقويم'
    },
    {
      title: 'رسالة جماعية',
      icon: MessageSquare,
      href: '/customer-service',
      color: 'bg-orange-600 hover:bg-orange-700',
      description: 'إرسال رسائل'
    },
    {
      title: 'إدارة العملاء',
      icon: Users,
      href: '/customers',
      color: 'bg-purple-600 hover:bg-purple-700',
      description: 'عرض العملاء'
    },
    {
      title: 'متابعة عاجلة',
      icon: Phone,
      href: '/customer-service',
      color: 'bg-red-600 hover:bg-red-700',
      description: 'مهام عاجلة'
    },
    {
      title: 'تقرير يومي',
      icon: FileText,
      href: '/reports',
      color: 'bg-gray-600 hover:bg-gray-700',
      description: 'تقرير اليوم'
    }
  ];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>إجراءات سريعة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Link key={action.title} to={action.href}>
                <Button 
                  variant="outline" 
                  className={`h-20 flex-col w-full ${action.color} hover:text-white group transition-all hover:shadow-md`}
                >
                  <Icon className="h-6 w-6 mb-2 group-hover:text-white" />
                  <span className="text-xs text-center group-hover:text-white">{action.title}</span>
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
