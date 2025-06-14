
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Calendar, Users, DollarSign } from 'lucide-react';

interface MetricProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'increase' | 'decrease';
  icon: React.ReactNode;
  color?: string;
}

const MetricCard = ({ title, value, change, changeType, icon, color = 'blue' }: MetricProps) => {
  const getTrendIcon = () => {
    if (change === undefined) return null;
    return changeType === 'increase' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getTrendColor = () => {
    if (changeType === 'increase') return 'text-green-600';
    if (changeType === 'decrease') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg bg-${color}-100`}>
              {icon}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className={`text-sm font-medium ${getTrendColor()}`}>
                {Math.abs(change)}%
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const PerformanceMetrics = () => {
  const metrics = [
    {
      title: 'إجمالي الإيرادات',
      value: '2,450,000 ج.م',
      change: 12.5,
      changeType: 'increase' as const,
      icon: <DollarSign className="h-5 w-5 text-green-600" />,
      color: 'green'
    },
    {
      title: 'العملاء الجدد',
      value: 89,
      change: 8.2,
      changeType: 'increase' as const,
      icon: <Users className="h-5 w-5 text-blue-600" />,
      color: 'blue'
    },
    {
      title: 'الحجوزات الشهرية',
      value: 156,
      change: -3.1,
      changeType: 'decrease' as const,
      icon: <Calendar className="h-5 w-5 text-orange-600" />,
      color: 'orange'
    },
    {
      title: 'معدل الرضا',
      value: '94%',
      change: 2.3,
      changeType: 'increase' as const,
      icon: <TrendingUp className="h-5 w-5 text-purple-600" />,
      color: 'purple'
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">مؤشرات الأداء الرئيسية</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>
    </div>
  );
};

export default PerformanceMetrics;
