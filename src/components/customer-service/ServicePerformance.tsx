
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MessageSquare } from "lucide-react";

interface ServicePerformanceProps {
  todayTasksCount: number;
  completedToday: number;
}

const ServicePerformance = ({ todayTasksCount, completedToday }: ServicePerformanceProps) => {
  const completionRate = todayTasksCount > 0 ? Math.round((completedToday / todayTasksCount) * 100) : 0;

  return (
    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">معدل الإنجاز اليومي</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">مهام اليوم المكتملة</span>
              <Badge variant="outline" className="text-green-700 bg-green-50">
                {completionRate}%
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${completionRate}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">إرشادات سريعة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded">
              <Calendar className="h-4 w-4 text-blue-600" />
              <span>تحقق من مهام اليوم أولاً</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded">
              <Clock className="h-4 w-4 text-yellow-600" />
              <span>ابدأ بالمهام المتأخرة</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-green-50 rounded">
              <MessageSquare className="h-4 w-4 text-green-600" />
              <span>تواصل مع العملاء بانتظام</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ServicePerformance;
