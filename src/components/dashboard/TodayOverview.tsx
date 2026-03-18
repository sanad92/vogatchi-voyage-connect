import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCustomerService } from '@/hooks/useCustomerService';

const FOLLOW_UP_LABELS: Record<string, string> = {
  pre_arrival_2days: '\u0645\u062a\u0627\u0628\u0639\u0629 \u0642\u0628\u0644 \u0627\u0644\u0648\u0635\u0648\u0644 \u0628\u064a\u0648\u0645\u064a\u0646',
  pre_arrival_1day: '\u0645\u062a\u0627\u0628\u0639\u0629 \u0642\u0628\u0644 \u0627\u0644\u0648\u0635\u0648\u0644 \u0628\u064a\u0648\u0645',
  arrival_day: '\u0645\u062a\u0627\u0628\u0639\u0629 \u064a\u0648\u0645 \u0627\u0644\u0648\u0635\u0648\u0644',
};

const TodayOverview = () => {
  const { todayTasks } = useCustomerService();

  const pendingTasks = todayTasks?.filter((task) => task.status === 'pending') || [];
  const inProgressTasks = todayTasks?.filter((task) => task.status === 'in_progress') || [];
  const completedTasks = todayTasks?.filter((task) => task.status === 'completed') || [];

  const todayDate = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {'\u0646\u0638\u0631\u0629 \u0639\u0627\u0645\u0629 \u0639\u0644\u0649 \u0627\u0644\u064a\u0648\u0645'}
          </CardTitle>
          <p className="text-xs sm:text-sm text-gray-600">{todayDate}</p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span className="text-lg sm:text-xl font-bold text-yellow-700">{pendingTasks.length}</span>
            </div>
            <p className="text-xs text-yellow-600">{'\u0641\u064a \u0627\u0644\u0627\u0646\u062a\u0638\u0627\u0631'}</p>
          </div>

          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="text-lg sm:text-xl font-bold text-blue-700">{inProgressTasks.length}</span>
            </div>
            <p className="text-xs text-blue-600">{'\u0642\u064a\u062f \u0627\u0644\u062a\u0646\u0641\u064a\u0630'}</p>
          </div>

          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-lg sm:text-xl font-bold text-green-700">{completedTasks.length}</span>
            </div>
            <p className="text-xs text-green-600">{'\u0645\u0643\u062a\u0645\u0644\u0629'}</p>
          </div>

          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-gray-600" />
              <span className="text-lg sm:text-xl font-bold text-gray-700">{todayTasks?.length || 0}</span>
            </div>
            <p className="text-xs text-gray-600">{'\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0645\u0647\u0627\u0645'}</p>
          </div>
        </div>

        {pendingTasks.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {'\u0645\u0647\u0627\u0645 \u0639\u0627\u062c\u0644\u0629 \u062a\u062d\u062a\u0627\u062c \u0645\u062a\u0627\u0628\u0639\u0629'}
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {pendingTasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between p-2 bg-red-50 rounded border-l-4 border-red-400"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.customer?.name || '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f'}</p>
                    <p className="text-xs text-gray-600">
                      {FOLLOW_UP_LABELS[task.follow_up_type] || '\u0645\u062a\u0627\u0628\u0639\u0629'}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs bg-red-100 text-red-700">
                    {'\u0639\u0627\u062c\u0644'}
                  </Badge>
                </div>
              ))}
            </div>
            {pendingTasks.length > 3 && (
              <p className="text-xs text-gray-500">
                {'\u0648'} {pendingTasks.length - 3} {'\u0645\u0647\u0627\u0645 \u0623\u062e\u0631\u0649...'}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Link to="/customer-service" className="flex-1">
            <Button className="w-full" size="sm">
              {'\u0639\u0631\u0636 \u062c\u0645\u064a\u0639 \u0645\u0647\u0627\u0645 \u0627\u0644\u064a\u0648\u0645'}
            </Button>
          </Link>
          <Link to="/bookings" className="flex-1">
            <Button variant="outline" className="w-full" size="sm">
              {'\u0639\u0631\u0636 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a'}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
};

export default TodayOverview;
