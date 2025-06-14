
import { Card, CardContent } from "@/components/ui/card";
import { Clock, AlertCircle, CheckCircle2, Users } from "lucide-react";

interface DailyStatsProps {
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  todayBookingsCount: number;
}

const DailyStats = ({
  pendingTasks,
  inProgressTasks,
  completedTasks,
  todayBookingsCount
}: DailyStatsProps) => {
  const stats = [
    {
      title: "مهام عالقة",
      value: pendingTasks,
      icon: Clock,
      color: "yellow"
    },
    {
      title: "قيد التنفيذ",
      value: inProgressTasks,
      icon: AlertCircle,
      color: "blue"
    },
    {
      title: "مكتملة",
      value: completedTasks,
      icon: CheckCircle2,
      color: "green"
    },
    {
      title: "وصول اليوم",
      value: todayBookingsCount,
      icon: Users,
      color: "orange"
    }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.title} className={`border-l-4 border-l-${stat.color}-500`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
              </div>
              <stat.icon className={`h-8 w-8 text-${stat.color}-500`} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default DailyStats;
