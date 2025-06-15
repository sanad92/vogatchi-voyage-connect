
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { useDetailedPermissions } from '@/hooks/useDetailedPermissions';
import { useUnifiedData } from '@/hooks/useUnifiedData';
import PermissionsStatsCards from './overview/PermissionsStatsCards';
import MostUsedPermissions from './overview/MostUsedPermissions';
import RoleDistribution from './overview/RoleDistribution';

const EnhancedPermissionsOverview = () => {
  const { allUserPermissions } = useDetailedPermissions();
  const { unifiedUsers } = useUnifiedData();

  // حساب الإحصائيات
  const totalUsers = unifiedUsers?.length || 0;
  const usersWithPermissions = Array.isArray(allUserPermissions) ? allUserPermissions.length : 0;
  const usersWithoutPermissions = totalUsers - usersWithPermissions;

  // تحليل الصلاحيات الشائعة
  const permissionStats = Array.isArray(allUserPermissions) ? allUserPermissions.reduce((acc, userPerms) => {
    Object.entries(userPerms).forEach(([key, value]) => {
      if (key.endsWith('_view') || key.endsWith('_create') || key.endsWith('_edit') || key.endsWith('_delete')) {
        if (!acc[key]) acc[key] = 0;
        if (value) acc[key]++;
      }
    });
    return acc;
  }, {} as Record<string, number>) : {};

  // إحصائيات الأدوار
  const roleStats = unifiedUsers?.reduce((acc, user) => {
    const role = user.role || 'no_role';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      <PermissionsStatsCards
        totalUsers={totalUsers}
        usersWithPermissions={usersWithPermissions}
        usersWithoutPermissions={usersWithoutPermissions}
      />

      <MostUsedPermissions
        permissionStats={permissionStats}
        totalUsers={totalUsers}
      />

      <RoleDistribution
        roleStats={roleStats}
        totalUsers={totalUsers}
      />

      {/* تحذيرات وتنبيهات */}
      {usersWithoutPermissions > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Clock className="h-5 w-5" />
              إجراءات مطلوبة
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-orange-800">
              <p>• يوجد {usersWithoutPermissions} مستخدم بدون صلاحيات محددة</p>
              <p>• يُنصح بمراجعة وتعيين الصلاحيات المناسبة لكل مستخدم</p>
              <p>• استخدم القوالب الجاهزة لتسريع عملية تعيين الصلاحيات</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedPermissionsOverview;
