
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users, 
  TrendingUp, 
  Star,
  Crown,
  Calendar
} from 'lucide-react';

interface ServiceStatsProps {
  todayTasksCount: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedToday: number;
  overdueTasks: number;
  totalTasks: number;
  urgentTasks?: number;
  vipTasks?: number;
}

const ServiceStats = ({ 
  todayTasksCount, 
  pendingTasks, 
  inProgressTasks, 
  completedToday, 
  overdueTasks, 
  totalTasks,
  urgentTasks = 0,
  vipTasks = 0
}: ServiceStatsProps) => {
  
  const completionRate = totalTasks > 0 ? Math.round((completedToday / totalTasks) * 100) : 0;
  const overDueRate = totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0;

  const stats = [
    {
      title: 'مهام اليوم',
      value: todayTasksCount,
      icon: Calendar,
      color: 'bg-blue-100 text-blue-700',
      description: 'إجمالي المهام'
    },
    {
      title: 'في الانتظار',
      value: pendingTasks,
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-700',
      description: 'تحتاج للبدء'
    },
    {
      title: 'قيد التنفيذ',
      value: inProgressTasks,
      icon: Users,
      color: 'bg-blue-100 text-blue-700',
      description: 'جاري العمل عليها'
    },
    {
      title: 'مكتملة اليوم',
      value: completedToday,
      icon: CheckCircle,
      color: 'bg-green-100 text-green-700',
      description: `معدل الإنجاز ${completionRate}%`
    },
    {
      title: 'مهام متأخرة',
      value: overdueTasks,
      icon: AlertTriangle,
      color: overdueTasks > 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700',
      description: overdueTasks > 0 ? `${overDueRate}% من المهام` : 'لا توجد مهام متأخرة'
    },
    {
      title: 'مهام عاجلة',
      value: urgentTasks,
      icon: Star,
      color: urgentTasks > 0 ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-700',
      description: 'تحتاج أولوية عالية'
    },
    {
      title: 'عملاء VIP',
      value: vipTasks,
      icon: Crown,
      color: vipTasks > 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700',
      description: 'مهام العملاء المميزين'
    },
    {
      title: 'معدل الأداء',
      value: `${completionRate}%`,
      icon: TrendingUp,
      color: completionRate >= 80 ? 'bg-green-100 text-green-700' : 
             completionRate >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700',
      description: completionRate >= 80 ? 'أداء ممتاز' : 
                   completionRate >= 60 ? 'أداء جيد' : 'يحتاج تحسين'
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              {/* إضافة badges للحالات المهمة */}
              {stat.title === 'مهام متأخرة' && overdueTasks > 0 && (
                <Badge variant="destructive" className="text-xs">عاجل</Badge>
              )}
              {stat.title === 'مهام عاجلة' && urgentTasks > 0 && (
                <Badge variant="destructive" className="text-xs">هام</Badge>
              )}
              {stat.title === 'عملاء VIP' && vipTasks > 0 && (
                <Badge className="bg-purple-100 text-purple-800 text-xs">VIP</Badge>
              )}
            </div>
            
            <div className="space-y-1">
              <div className="text-2xl font-bold text-gray-900">
                {stat.value}
              </div>
              <div className="text-sm font-medium text-gray-700">
                {stat.title}
              </div>
              <div className="text-xs text-gray-500">
                {stat.description}
              </div>
            </div>

            {/* شريط تقدم للمعدلات */}
            {stat.title === 'معدل الأداء' && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      completionRate >= 80 ? 'bg-green-500' : 
                      completionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${completionRate}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>

          {/* تأثير بصري للحالات الطارئة */}
          {stat.title === 'مهام متأخرة' && overdueTasks > 0 && (
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
          )}
          {stat.title === 'مهام عاجلة' && urgentTasks > 0 && (
            <div className="absolute top-0 left-0 w-full h-1 bg-orange-500" />
          )}
        </Card>
      ))}
    </div>
  );
};

export default ServiceStats;
