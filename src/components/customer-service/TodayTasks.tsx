
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Users } from 'lucide-react';
import FollowUpCard from './FollowUpCard';
import { useCustomerService } from '@/hooks/useCustomerService';

const TodayTasks = () => {
  const { todayTasks, updateFollowUp, addCommunication } = useCustomerService();

  const pendingTasks = todayTasks?.filter(task => task.status === 'pending') || [];
  const inProgressTasks = todayTasks?.filter(task => task.status === 'in_progress') || [];
  const completedTasks = todayTasks?.filter(task => task.status === 'completed') || [];

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" />
          مهام اليوم
        </h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1 text-xs sm:text-sm">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
            {pendingTasks.length} في الانتظار
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1 text-xs sm:text-sm">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            {inProgressTasks.length} قيد التنفيذ
          </Badge>
        </div>
      </div>

      {!todayTasks || todayTasks.length === 0 ? (
        <Card>
          <CardContent className="py-6 sm:py-8 text-center text-gray-500 text-sm sm:text-base">
            لا توجد مهام متابعة لليوم
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* المهام في الانتظار */}
          <div>
            <h3 className="font-semibold mb-3 text-yellow-700 text-sm sm:text-base">
              في الانتظار ({pendingTasks.length})
            </h3>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <FollowUpCard
                  key={task.id}
                  followUp={task}
                  onUpdate={updateFollowUp}
                  onCommunicate={addCommunication}
                />
              ))}
            </div>
          </div>

          {/* المهام قيد التنفيذ */}
          <div>
            <h3 className="font-semibold mb-3 text-blue-700 text-sm sm:text-base">
              قيد التنفيذ ({inProgressTasks.length})
            </h3>
            <div className="space-y-3">
              {inProgressTasks.map((task) => (
                <FollowUpCard
                  key={task.id}
                  followUp={task}
                  onUpdate={updateFollowUp}
                  onCommunicate={addCommunication}
                />
              ))}
            </div>
          </div>

          {/* المهام المكتملة */}
          <div>
            <h3 className="font-semibold mb-3 text-green-700 text-sm sm:text-base">
              مكتملة ({completedTasks.length})
            </h3>
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <FollowUpCard
                  key={task.id}
                  followUp={task}
                  onUpdate={updateFollowUp}
                  onCommunicate={addCommunication}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TodayTasks;
