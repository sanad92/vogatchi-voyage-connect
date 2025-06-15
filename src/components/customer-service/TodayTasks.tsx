
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import FollowUpFilters from './FollowUpFilters';
import TasksHeader from './tasks/TasksHeader';
import TaskAlerts from './tasks/TaskAlerts';
import TaskColumn from './tasks/TaskColumn';
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
    if (filters.priority && (task.priority || 'normal') !== filters.priority) return false;
    if (filters.status && task.status !== filters.status) return false;
    if (filters.customerValue && (task.customer_value || 'regular') !== filters.customerValue) return false;
    return true;
  }) || [];

  // تصنيف المهام
  const urgentTasks = filteredTasks.filter(task => 
    (task.priority || 'normal') === 'urgent' && task.status !== 'completed'
  );
  
  const overdueTasks = filteredTasks.filter(task => 
    task.status !== 'completed' && new Date(task.scheduled_date) < new Date()
  );

  const pendingTasks = filteredTasks.filter(task => task.status === 'pending');
  const inProgressTasks = filteredTasks.filter(task => task.status === 'in_progress');
  const completedTasks = filteredTasks.filter(task => task.status === 'completed');

  // ترتيب المهام حسب الأولوية
  const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
  
  const sortedPendingTasks = pendingTasks.sort((a, b) => {
    const aPriority = priorityOrder[(a.priority || 'normal') as keyof typeof priorityOrder] || 2;
    const bPriority = priorityOrder[(b.priority || 'normal') as keyof typeof priorityOrder] || 2;
    return bPriority - aPriority;
  });

  const sortedInProgressTasks = inProgressTasks.sort((a, b) => {
    const aPriority = priorityOrder[(a.priority || 'normal') as keyof typeof priorityOrder] || 2;
    const bPriority = priorityOrder[(b.priority || 'normal') as keyof typeof priorityOrder] || 2;
    return bPriority - aPriority;
  });

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      <TasksHeader
        pendingCount={pendingTasks.length}
        inProgressCount={inProgressTasks.length}
        urgentCount={urgentTasks.length}
        overdueCount={overdueTasks.length}
      />

      <FollowUpFilters 
        currentFilters={filters}
        onFiltersChange={setFilters}
      />

      <TaskAlerts
        urgentCount={urgentTasks.length}
        overdueCount={overdueTasks.length}
      />

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
          <TaskColumn
            title="في الانتظار"
            titleColor="text-yellow-700"
            tasks={sortedPendingTasks}
            urgentCount={urgentTasks.filter(t => t.status === 'pending').length}
            onUpdate={updateFollowUp}
            onCommunicate={addCommunication}
          />

          <TaskColumn
            title="قيد التنفيذ"
            titleColor="text-blue-700"
            tasks={sortedInProgressTasks}
            urgentCount={urgentTasks.filter(t => t.status === 'in_progress').length}
            onUpdate={updateFollowUp}
            onCommunicate={addCommunication}
          />

          <TaskColumn
            title="مكتملة"
            titleColor="text-green-700"
            tasks={completedTasks}
            onUpdate={updateFollowUp}
            onCommunicate={addCommunication}
          />
        </div>
      )}
    </div>
  );
};

export default TodayTasks;
