
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

interface TaskAlertsProps {
  urgentCount: number;
  overdueCount: number;
}

const TaskAlerts = ({ urgentCount, overdueCount }: TaskAlertsProps) => {
  if (urgentCount === 0 && overdueCount === 0) return null;

  return (
    <>
      {urgentCount > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                تنبيه: يوجد {urgentCount} مهام عاجلة تحتاج لمتابعة فورية!
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {overdueCount > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-orange-700">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-medium">
                تحذير: يوجد {overdueCount} مهام متأخرة!
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default TaskAlerts;
