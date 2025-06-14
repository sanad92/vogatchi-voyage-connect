
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-6 w-6" />
          مهام اليوم
        </h2>
        <div className="flex gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {pendingTasks.length} في الانتظار
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {inProgressTasks.length} قيد التنفيذ
          </Badge>
        </div>
      </div>

      {!todayTasks || todayTasks.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            لا توجد مهام متابعة لليوم
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* المهام في الانتظار */}
          <div>
            <h3 className="font-semibold mb-3 text-yellow-700">في الانتظار ({pendingTasks.length})</h3>
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
            <h3 className="font-semibold mb-3 text-blue-700">قيد التنفيذ ({inProgressTasks.length})</h3>
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
            <h3 className="font-semibold mb-3 text-green-700">مكتملة ({completedTasks.length})</h3>
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
