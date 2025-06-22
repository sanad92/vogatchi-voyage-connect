
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  MessageCircle, 
  Users, 
  TrendingUp,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const WhatsAppAnalyticsDashboard: React.FC = () => {
  // بيانات وهمية للعرض - سيتم ربطها بقاعدة البيانات لاحقاً
  const stats = [
    {
      title: 'إجمالي الرسائل',
      value: '1,245',
      change: '+12%',
      icon: MessageCircle,
      color: 'text-blue-600'
    },
    {
      title: 'المحادثات النشطة',
      value: '47',
      change: '+8%',
      icon: Users,
      color: 'text-green-600'
    },
    {
      title: 'معدل الاستجابة',
      value: '95%',
      change: '+3%',
      icon: TrendingUp,
      color: 'text-purple-600'
    },
    {
      title: 'متوسط وقت الرد',
      value: '3.2 دقيقة',
      change: '-15%',
      icon: Clock,
      color: 'text-orange-600'
    }
  ];

  const dailyStats = [
    { day: 'الأحد', messages: 45, conversations: 12 },
    { day: 'الاثنين', messages: 67, conversations: 18 },
    { day: 'الثلاثاء', messages: 52, conversations: 15 },
    { day: 'الأربعاء', messages: 78, conversations: 22 },
    { day: 'الخميس', messages: 65, conversations: 19 },
    { day: 'الجمعة', messages: 43, conversations: 11 },
    { day: 'السبت', messages: 38, conversations: 9 }
  ];

  const topAgents = [
    { name: 'أحمد محمد', messages: 156, satisfaction: 4.8 },
    { name: 'فاطمة علي', messages: 142, satisfaction: 4.7 },
    { name: 'محمد أحمد', messages: 138, satisfaction: 4.6 },
    { name: 'سارة خالد', messages: 125, satisfaction: 4.5 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">إحصائيات WhatsApp Business</h2>
        <div className="flex gap-2">
          <Badge variant="outline">آخر 7 أيام</Badge>
          <Badge variant="outline">تحديث تلقائي</Badge>
        </div>
      </div>

      {/* إحصائيات رئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className={`text-sm ${
                    stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change} من الأسبوع الماضي
                  </p>
                </div>
                <div className={`p-3 rounded-lg bg-gray-100 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* إحصائيات يومية */}
        <Card>
          <CardHeader>
            <CardTitle>الأداء اليومي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dailyStats.map((day, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{day.day}</span>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-medium">{day.messages} رسالة</div>
                      <div className="text-xs text-gray-500">{day.conversations} محادثة</div>
                    </div>
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(day.messages / 80) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* أفضل الموظفين */}
        <Card>
          <CardHeader>
            <CardTitle>أفضل الموظفين</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topAgents.map((agent, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-medium">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-sm text-gray-500">{agent.messages} رسالة</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-medium">{agent.satisfaction}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تفاصيل إضافية */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">أوقات الذروة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>9:00 - 12:00</span>
                <Badge variant="secondary">45%</Badge>
              </div>
              <div className="flex justify-between">
                <span>14:00 - 17:00</span>
                <Badge variant="secondary">35%</Badge>
              </div>
              <div className="flex justify-between">
                <span>19:00 - 21:00</span>
                <Badge variant="secondary">20%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">أنواع الرسائل</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>نصية</span>
                <Badge variant="outline">78%</Badge>
              </div>
              <div className="flex justify-between">
                <span>صور</span>
                <Badge variant="outline">15%</Badge>
              </div>
              <div className="flex justify-between">
                <span>مستندات</span>
                <Badge variant="outline">7%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">حالة النظام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>WhatsApp API</span>
                <Badge className="bg-green-100 text-green-800">متصل</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Webhook</span>
                <Badge className="bg-green-100 text-green-800">نشط</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>قاعدة البيانات</span>
                <Badge className="bg-green-100 text-green-800">طبيعي</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
