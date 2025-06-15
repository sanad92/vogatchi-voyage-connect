
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface MostUsedPermissionsProps {
  permissionStats: Record<string, number>;
  totalUsers: number;
}

const MostUsedPermissions = ({ permissionStats, totalUsers }: MostUsedPermissionsProps) => {
  // الصلاحيات الأكثر استخداماً
  const mostUsedPermissions = Object.entries(permissionStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const getPermissionDisplayName = (permission: string) => {
    return permission
      .replace(/_view$/, ' - عرض')
      .replace(/_create$/, ' - إنشاء')
      .replace(/_edit$/, ' - تعديل')
      .replace(/_delete$/, ' - حذف')
      .replace(/customers/, 'العملاء')
      .replace(/bookings/, 'الحجوزات')
      .replace(/invoices/, 'الفواتير')
      .replace(/suppliers/, 'الموردين')
      .replace(/reports/, 'التقارير')
      .replace(/employees/, 'الموظفين')
      .replace(/expenses/, 'المصروفات')
      .replace(/system/, 'النظام')
      .replace(/banking/, 'البنوك');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>الصلاحيات الأكثر استخداماً</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mostUsedPermissions.map(([permission, count]) => {
            const percentage = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
            const permissionName = getPermissionDisplayName(permission);

            return (
              <div key={permission} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{permissionName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={percentage} className="flex-1 h-2" />
                      <span className="text-xs text-gray-500 whitespace-nowrap">
                        {count} من {totalUsers}
                      </span>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="ml-2">
                  {percentage}%
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default MostUsedPermissions;
