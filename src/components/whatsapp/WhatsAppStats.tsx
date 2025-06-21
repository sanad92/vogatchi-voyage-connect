
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Users, Clock, CheckCircle } from 'lucide-react';

export const WhatsAppStats: React.FC = () => {
  // إحصائيات مؤقتة - سيتم ربطها بقاعدة البيانات لاحقاً
  const stats = [
    {
      title: 'المحادثات النشطة',
      value: '5',
      icon: MessageCircle,
      color: 'text-green-600'
    },
    {
      title: 'العملاء الجدد',
      value: '3',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'في الانتظار',
      value: '2',
      icon: Clock,
      color: 'text-yellow-600'
    },
    {
      title: 'تم الإنجاز',
      value: '12',
      icon: CheckCircle,
      color: 'text-emerald-600'
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">إحصائيات اليوم</h3>
      
      <div className="grid grid-cols-1 gap-3">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gray-100 ${stat.color}`}>
                  <stat.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">معدل الاستجابة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">95%</div>
          <p className="text-xs text-gray-500">متوسط خلال 5 دقائق</p>
        </CardContent>
      </Card>
    </div>
  );
};
