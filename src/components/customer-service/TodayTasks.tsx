
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Users, AlertTriangle } from 'lucide-react';
import FollowUpCard from './FollowUpCard';
import FollowUpFilters from './FollowUpFilters';
import { useCustomerService } from '@/hooks/useCustomerService';

interface FilterState {
  type?: string;
  priority?: string;
  status?: string;
  assignedTo?: string;
  customerValue?: string;
}

const TodayTasks = () => {
  const { todayTasks, updateFollowUp, addCommunication } = useCustomerService();
  const [filters, setFilters] = useState<FilterState>({});

  // تطبيق الفلاتر
  const filteredTasks = todayTasks?.filter(task => {
    if (filters.type && task.follow_up_type !== filters.type) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.customerValue && task.customer_value !== filters.customerValue) return false;
    return true;
  }) || [];

  // تصنيف المهام حسب الأولوية والحالة
  const urgentTasks = filteredTasks.filter(task => 
    task.priority === 'urgent' && task.status !== 'completed'
  );
  
  const overdueTasks = filteredTasks.filter(task => 
    task.status !== 'completed' && new Date(task.scheduled_date) < new Date()
  );

  const pendingTasks = filteredTasks.filter(task => task.status === 'pending');
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in_progress');
  const completedTasks = filteredTasks.filter(task => task.status === 'completed');

  // ترتيب المهام حسب الأولوية
  const sortedPendingTasks = pendingTasks.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
    return bPriority - aPriority;
  });

  const sortedInProgressTasks = inProgressTasks.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
    const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 2;
    const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 2;
    return bPriority - aPriority;
  });

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
          {urgentTasks.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 text-xs sm:text-sm">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
              {urgentTasks.length} عاجل
            </Badge>
          )}
          {overdueTasks.length > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 text-xs sm:text-sm">
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
              {overdueTasks.length} متأخر
            </Badge>
          )}
        </div>
      </div>

      {/* الفلاتر */}
      <FollowUpFilters 
        currentFilters={filters}
        onFiltersChange={setFilters}
      />

      {/* تنبيهات */}
      {urgentTasks.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                تنبيه: يوجد {urgentTasks.length} مهام عاجلة تحتاج لمتابعة فورية!
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {overdueTasks.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                تحذير: يوجد {overdueTasks.length} مهام متأخرة!
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {!todayTasks || todayTasks.length === 0 ? (
        <Card>
          <CardContent className="py-6 sm:py-8 text-center text-gray-500 text-sm sm:text-base">
            لا توجد مهام متابعة لليوم
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-6 sm:py-8 text-center text-gray-500 text-sm sm:text-base">
            لا توجد مهام تطابق الفلاتر المحددة
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* المهام في الانتظار */}
          <div>
            <h3 className="font-semibold mb-3 text-yellow-700 text-sm sm:text-base flex items-center gap-2">
              في الانتظار ({sortedPendingTasks.length})
              {urgentTasks.filter(t => t.status === 'pending').length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {urgentTasks.filter(t => t.status === 'pending').length} عاجل
                </Badge>
              )}
            </h3>
            <div className="space-y-3">
              {sortedPendingTasks.map((task) => (
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
            <h3 className="font-semibold mb-3 text-blue-700 text-sm sm:text-base flex items-center gap-2">
              قيد التنفيذ ({sortedInProgressTasks.length})
              {urgentTasks.filter(t => t.status === 'in_progress').length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {urgentTasks.filter(t => t.status === 'in_progress').length} عاجل
                </Badge>
              )}
            </h3>
            <div className="space-y-3">
              {sortedInProgressTasks.map((task) => (
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
