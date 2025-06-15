
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, Users, AlertTriangle } from 'lucide-react';

interface TasksHeaderProps {
  pendingCount: number;
  inProgressCount: number;
  urgentCount: number;
  overdueCount: number;
}

const TasksHeader = ({ pendingCount, inProgressCount, urgentCount, overdueCount }: TasksHeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
        <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6" />
        مهام اليوم
      </h2>
      <div className="flex flex-wrap gap-2">
        <Badge variant="outline" className="flex items-center gap-1 text-xs sm:text-sm">
          <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
          {pendingCount} في الانتظار
        </Badge>
        <Badge variant="outline" className="flex items-center gap-1 text-xs sm:text-sm">
          <Users className="h-3 w-3 sm:h-4 sm:w-4" />
          {inProgressCount} قيد التنفيذ
        </Badge>
        {urgentCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1 text-xs sm:text-sm">
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
            {urgentCount} عاجل
          </Badge>
        )}
        {overdueCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1 text-xs sm:text-sm">
            <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
            {overdueCount} متأخر
          </Badge>
        )}
      </div>
    </div>
  );
};

export default TasksHeader;
