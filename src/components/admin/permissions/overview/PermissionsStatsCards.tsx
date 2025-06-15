
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Shield, Users, CheckCircle, AlertTriangle } from 'lucide-react';

interface PermissionsStatsCardsProps {
  totalUsers: number;
  usersWithPermissions: number;
  usersWithoutPermissions: number;
}

const PermissionsStatsCards = ({ 
  totalUsers, 
  usersWithPermissions, 
  usersWithoutPermissions 
}: PermissionsStatsCardsProps) => {
  const coveragePercentage = totalUsers > 0 ? Math.round((usersWithPermissions / totalUsers) * 100) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">إجمالي المستخدمين</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalUsers}</div>
          <p className="text-xs text-muted-foreground">
            جميع المستخدمين المسجلين
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">لديهم صلاحيات</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{usersWithPermissions}</div>
          <p className="text-xs text-muted-foreground">
            تم تعيين صلاحيات لهم
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">بدون صلاحيات</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{usersWithoutPermissions}</div>
          <p className="text-xs text-muted-foreground">
            يحتاجون لتعيين صلاحيات
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">معدل التغطية</CardTitle>
          <Shield className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{coveragePercentage}%</div>
          <Progress value={coveragePercentage} className="mt-2" />
        </CardContent>
      </Card>
    </div>
  );
};

export default PermissionsStatsCards;
