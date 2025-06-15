
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RoleDistributionProps {
  roleStats: Record<string, number>;
  totalUsers: number;
}

const RoleDistribution = ({ roleStats, totalUsers }: RoleDistributionProps) => {
  const roleNames: Record<string, string> = {
    'super_admin': 'سوبر أدمن',
    'admin': 'أدمن',
    'manager': 'مدير',
    'sales_agent': 'مندوب مبيعات',
    'accountant': 'محاسب',
    'viewer': 'مشاهد',
    'no_role': 'بدون دور'
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>توزيع الأدوار</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(roleStats).map(([role, count]) => {
            const percentage = Math.round((count / totalUsers) * 100);
            
            return (
              <div key={role} className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{count}</div>
                <div className="text-sm font-medium">{roleNames[role] || role}</div>
                <div className="text-xs text-gray-500">{percentage}%</div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default RoleDistribution;
