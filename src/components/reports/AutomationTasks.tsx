
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Clock, MessageSquare, Mail, Calendar, Settings, Play, Pause } from 'lucide-react';

interface AutomationTask {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  lastRun?: string;
  nextRun?: string;
  type: 'email' | 'whatsapp' | 'follow_up' | 'reminder';
  frequency: string;
}

const AutomationTasks = () => {
  const tasks: AutomationTask[] = [
    {
      id: '1',
      name: 'تذكير ما قبل الوصول',
      description: 'إرسال رسائل تذكير للعملاء قبل يومين من موعد الوصول',
      isActive: true,
      lastRun: '2024-01-15 09:00',
      nextRun: '2024-01-16 09:00',
      type: 'whatsapp',
      frequency: 'يومي'
    },
    {
      id: '2',
      name: 'متابعة ما بعد المغادرة',
      description: 'استطلاع رضا العملاء بعد انتهاء الرحلة',
      isActive: true,
      lastRun: '2024-01-15 14:00',
      nextRun: '2024-01-16 14:00',
      type: 'email',
      frequency: 'يومي'
    },
    {
      id: '3',
      name: 'تذكير الدفع',
      description: 'تذكير العملاء بالمدفوعات المستحقة',
      isActive: false,
      type: 'email',
      frequency: 'أسبوعي'
    },
    {
      id: '4',
      name: 'تقرير الأداء الشهري',
      description: 'إرسال تقرير شهري للإدارة بإحصائيات الأداء',
      isActive: true,
      lastRun: '2024-01-01 08:00',
      nextRun: '2024-02-01 08:00',
      type: 'email',
      frequency: 'شهري'
    }
  ];

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'whatsapp':
        return <MessageSquare className="h-5 w-5" />;
      case 'follow_up':
        return <Calendar className="h-5 w-5" />;
      case 'reminder':
        return <Clock className="h-5 w-5" />;
      default:
        return <Settings className="h-5 w-5" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'bg-blue-100 text-blue-800';
      case 'whatsapp':
        return 'bg-green-100 text-green-800';
      case 'follow_up':
        return 'bg-purple-100 text-purple-800';
      case 'reminder':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          مهام الأتمتة
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded ${getTypeColor(task.type)}`}>
                    {getTaskIcon(task.type)}
                  </div>
                  <div>
                    <h4 className="font-medium">{task.name}</h4>
                    <p className="text-sm text-gray-600">{task.description}</p>
                  </div>
                </div>
                <Switch checked={task.isActive} />
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <Badge variant="outline">{task.frequency}</Badge>
                {task.lastRun && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    آخر تشغيل: {task.lastRun}
                  </div>
                )}
                {task.nextRun && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    التشغيل التالي: {task.nextRun}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline">
                  {task.isActive ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  {task.isActive ? 'إيقاف' : 'تشغيل'}
                </Button>
                <Button size="sm" variant="outline">
                  <Settings className="h-4 w-4 mr-1" />
                  إعدادات
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default AutomationTasks;
