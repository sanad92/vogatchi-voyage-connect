
import { Badge } from '@/components/ui/badge';
import FollowUpCard from '../FollowUpCard';

interface TaskColumnProps {
  title: string;
  titleColor: string;
  tasks: any[];
  urgentCount?: number;
  onUpdate: (id: string, data: any) => void;
  onCommunicate: (data: any) => void;
}

const TaskColumn = ({ title, titleColor, tasks, urgentCount, onUpdate, onCommunicate }: TaskColumnProps) => {
  return (
    <div>
      <h3 className={`font-semibold mb-3 text-sm sm:text-base flex items-center gap-2 ${titleColor}`}>
        {title} ({tasks.length})
        {urgentCount && urgentCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {urgentCount} عاجل
          </Badge>
        )}
      </h3>
      <div className="space-y-3">
        {tasks.map((task) => (
          <FollowUpCard
            key={task.id}
            followUp={task}
            onUpdate={onUpdate}
            onCommunicate={onCommunicate}
          />
        ))}
      </div>
    </div>
  );
};

export default TaskColumn;
