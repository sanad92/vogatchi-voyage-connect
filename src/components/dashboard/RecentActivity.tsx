
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Receipt, MessageSquare, Clock } from 'lucide-react';

const RecentActivity = () => {
  // بيانات تجريبية - ستأتي من قاعدة البيانات لاحقاً
  const activities = [
    {
      id: 1,
      type: 'booking',
      title: 'حجز جديد',
      description: 'حجز فندق شرم الشيخ - أحمد علي',
      time: '10:30 ص',
      icon: Calendar,
      color: 'bg-blue-100 text-blue-700'
    },
    {
      id: 2,
      type: 'customer',
      title: 'عميل جديد',
      description: 'تم تسجيل سارة محمد',
      time: '09:15 ص',
      icon: Users,
      color: 'bg-green-100 text-green-700'
    },
    {
      id: 3,
      type: 'invoice',
      title: 'فاتورة مدفوعة',
      description: 'فاتورة #INV-2024-000123 - 15,000 ج.م',
      time: '08:45 ص',
      icon: Receipt,
      color: 'bg-purple-100 text-purple-700'
    },
    {
      id: 4,
      type: 'followup',
      title: 'متابعة عميل',
      description: 'تم التواصل مع محمد أحمد',
      time: '08:30 ص',
      icon: MessageSquare,
      color: 'bg-orange-100 text-orange-700'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <Clock className="h-5 w-5" />
          النشاط الأخير
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="flex items-start gap-3 p-2 sm:p-3 hover:bg-gray-50 rounded-lg transition-colors">
                <div className={`p-2 rounded-lg ${activity.color} flex-shrink-0`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                    <span className="text-xs text-gray-500 flex-shrink-0">{activity.time}</span>
                  </div>
                  <p className="text-sm text-gray-600 truncate">{activity.description}</p>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            عرض جميع الأنشطة
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
