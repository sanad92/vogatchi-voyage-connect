import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCustomerService } from '@/hooks/useCustomerService';
import { cn } from '@/lib/utils';

const TodayOverview = () => {
  const { todayTasks } = useCustomerService();

  const pendingTasks = todayTasks?.filter(task => task.status === 'pending') || [];
  const inProgressTasks = todayTasks?.filter(task => task.status === 'in_progress') || [];
  const completedTasks = todayTasks?.filter(task => task.status === 'completed') || [];
  const total = todayTasks?.length || 0;

  const stats = [
    { label: 'في الانتظار', count: pendingTasks.length, icon: Clock, color: 'text-[hsl(var(--warning))]', bg: 'bg-[hsl(var(--warning))]/10' },
    { label: 'قيد التنفيذ', count: inProgressTasks.length, icon: AlertCircle, color: 'text-[hsl(var(--info))]', bg: 'bg-[hsl(var(--info))]/10' },
    { label: 'مكتملة', count: completedTasks.length, icon: CheckCircle2, color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success))]/10' },
    { label: 'الإجمالي', count: total, icon: Users, color: 'text-muted-foreground', bg: 'bg-muted' },
  ];

  return (
    <Card className="shadow-md border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Calendar className="h-4 w-4 text-primary" />
            </div>
            مهام اليوم
          </CardTitle>
          <Link to="/customer-service">
            <Button variant="ghost" size="sm" className="text-xs gap-1">
              عرض الكل
              <ArrowLeft className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {stats.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className={cn("flex items-center gap-2 p-3 rounded-xl", s.bg)}>
                <Icon className={cn("h-4 w-4", s.color)} />
                <div>
                  <p className={cn("text-lg font-bold", s.color)}>{s.count}</p>
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                </div>
              </div>
            );
          })}
        </div>

        {pendingTasks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />
              مهام عاجلة
            </p>
            {pendingTasks.slice(0, 2).map((task) => (
              <div key={task.id} className="flex items-center justify-between p-2.5 bg-destructive/5 rounded-lg border-r-2 border-destructive">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {task.customer?.name || 'غير محدد'}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {task.follow_up_type === 'pre_arrival_2days' && 'قبل الوصول بيومين'}
                    {task.follow_up_type === 'pre_arrival_1day' && 'قبل الوصول بيوم'}
                    {task.follow_up_type === 'arrival_day' && 'يوم الوصول'}
                  </p>
                </div>
                <Badge variant="destructive" className="text-[10px]">عاجل</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayOverview;
