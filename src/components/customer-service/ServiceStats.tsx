
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Clock, CheckCircle2, AlertCircle, TrendingUp } from "lucide-react";

interface ServiceStatsProps {
  todayTasksCount: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedToday: number;
  overdueTasks: number;
  totalTasks: number;
}

const ServiceStats = ({
  todayTasksCount,
  pendingTasks,
  inProgressTasks,
  completedToday,
  overdueTasks,
  totalTasks
}: ServiceStatsProps) => {
  const stats = [
    {
      title: "المهام اليوم",
      value: todayTasksCount,
      icon: Calendar,
      color: "blue"
    },
    {
      title: "في الانتظار",
      value: pendingTasks,
      icon: Clock,
      color: "yellow"
    },
    {
      title: "قيد التنفيذ",
      value: inProgressTasks,
      icon: AlertCircle,
      color: "orange"
    },
    {
      title: "مكتمل اليوم",
      value: completedToday,
      icon: CheckCircle2,
      color: "green"
    },
    {
      title: "متأخرة",
      value: overdueTasks,
      icon: AlertCircle,
      color: "red"
    },
    {
      title: "إجمالي المهام",
      value: totalTasks,
      icon: TrendingUp,
      color: "gray"
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className={`border-l-4 border-l-${stat.color}-500`}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`text-lg sm:text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
              </div>
              <stat.icon className={`h-6 w-6 sm:h-8 sm:w-8 text-${stat.color}-500`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ServiceStats;
