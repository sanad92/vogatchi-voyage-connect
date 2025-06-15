
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Briefcase, UserX, TrendingUp, Activity } from 'lucide-react';

interface UnifiedStatsHeaderEnhancedProps {
  totalUsers: number;
  linkedUsers: number;
  unlinkedEmployees: number;
}

const UnifiedStatsHeaderEnhanced = ({ 
  totalUsers, 
  linkedUsers, 
  unlinkedEmployees 
}: UnifiedStatsHeaderEnhancedProps) => {
  const linkagePercentage = totalUsers > 0 ? Math.round((linkedUsers / totalUsers) * 100) : 0;

  const stats = [
    {
      title: 'إجمالي المستخدمين',
      value: totalUsers,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'from-blue-50 to-blue-100',
      textColor: 'text-blue-700',
      iconBg: 'bg-blue-500'
    },
    {
      title: 'الموظفين المرتبطين',
      value: linkedUsers,
      icon: Briefcase,
      color: 'from-green-500 to-green-600',
      bgColor: 'from-green-50 to-green-100',
      textColor: 'text-green-700',
      iconBg: 'bg-green-500'
    },
    {
      title: 'الموظفين غير المرتبطين',
      value: unlinkedEmployees,
      icon: UserX,
      color: 'from-orange-500 to-orange-600',
      bgColor: 'from-orange-50 to-orange-100',
      textColor: 'text-orange-700',
      iconBg: 'bg-orange-500'
    },
    {
      title: 'نسبة الربط',
      value: `${linkagePercentage}%`,
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      bgColor: 'from-purple-50 to-purple-100',
      textColor: 'text-purple-700',
      iconBg: 'bg-purple-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="relative">
          <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
            إدارة المستخدمين والموظفين الموحدة
          </h2>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-blue-800/10 blur-2xl -z-10" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl mx-auto">
          نظام شامل لإدارة حسابات المستخدمين وبيانات الموظفين بطريقة متقدمة وفعالة
        </p>
        
        {/* Status Indicator */}
        <div className="flex items-center justify-center gap-2">
          <Activity className="h-4 w-4 text-green-500 animate-pulse" />
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
            النظام يعمل بكفاءة عالية
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={stat.title}
            className={`group hover:shadow-xl transition-all duration-300 hover:scale-105 border-0 shadow-lg bg-gradient-to-br ${stat.bgColor} dark:from-gray-800 dark:to-gray-900`}
            style={{
              animationDelay: `${index * 0.1}s`
            }}
          >
            <CardContent className="p-6 relative overflow-hidden">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-grid-pattern" />
              </div>
              
              <div className="relative z-10 flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {stat.title}
                  </p>
                  <p className={`text-2xl md:text-3xl font-bold ${stat.textColor} dark:text-white`}>
                    {stat.value}
                  </p>
                </div>
                
                <div className={`p-3 rounded-full ${stat.iconBg} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              
              {/* Progress Indicator for Linkage Percentage */}
              {stat.title === 'نسبة الربط' && (
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400">
                    <span>0%</span>
                    <span>100%</span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full bg-gradient-to-r ${stat.color} transition-all duration-1000 ease-out`}
                      style={{ width: `${linkagePercentage}%` }}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Insights */}
      <div className="flex flex-wrap justify-center gap-2">
        <Badge 
          variant="outline" 
          className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
        >
          معدل الربط: {linkagePercentage}%
        </Badge>
        <Badge 
          variant="outline"
          className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-green-200 dark:border-green-800 text-green-700 dark:text-green-300"
        >
          {linkedUsers} من {totalUsers} مرتبط
        </Badge>
        {unlinkedEmployees > 0 && (
          <Badge 
            variant="outline"
            className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300"
          >
            {unlinkedEmployees} موظف بحاجة لربط
          </Badge>
        )}
      </div>
    </div>
  );
};

export default UnifiedStatsHeaderEnhanced;
