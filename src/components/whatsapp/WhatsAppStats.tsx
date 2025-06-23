
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle, Users, Clock, TrendingUp } from 'lucide-react';

export const WhatsAppStats: React.FC = () => {
  // بيانات وهمية - سيتم ربطها بقاعدة البيانات لاحقاً
  const stats = [
    {
      title: 'الرسائل اليوم',
      value: '24',
      icon: MessageCircle,
      color: 'text-blue-600'
    },
    {
      title: 'المحادثات النشطة',
      value: '8',
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: 'متوسط الرد',
      value: '2.5 دقيقة',
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      title: 'معدل الاستجابة',
      value: '95%',
      icon: TrendingUp,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">إحصائيات سريعة</h3>
      
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.title}</p>
                <p className="text-xl font-bold">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg bg-gray-100 ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
