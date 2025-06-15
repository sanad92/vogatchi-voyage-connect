
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, Users, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { useDetailedPermissions } from '@/hooks/useDetailedPermissions';
import { useUnifiedData } from '@/hooks/useUnifiedData';

const EnhancedPermissionsOverview = () => {
  const { allUserPermissions } = useDetailedPermissions();
  const { unifiedUsers } = useUnifiedData();

  // حساب الإحصائيات
  const totalUsers = unifiedUsers?.length || 0;
  const usersWithPermissions = allUserPermissions?.length || 0;
  const usersWithoutPermissions = totalUsers - usersWithPermissions;

  // تحليل الصلاحيات الشائعة
  const permissionStats = allUserPermissions?.reduce((acc, userPerms) => {
    Object.entries(userPerms).forEach(([key, value]) => {
      if (key.endsWith('_view') || key.endsWith('_create') || key.endsWith('_edit') || key.endsWith('_delete')) {
        if (!acc[key]) acc[key] = 0;
        if (value) acc[key]++;
      }
    });
    return acc;
  }, {} as Record<string, number>) || {};

  // الصلاحيات الأكثر استخداماً
  const mostUsedPermissions = Object.entries(permissionStats)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  // إحصائيات الأدوار
  const roleStats = unifiedUsers?.reduce((acc, user) => {
    const role = user.role || 'no_role';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  return (
    <div className="space-y-6">
      {/* إحصائيات عامة */}
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
            <div className="text-2xl font-bold text-blue-600">
              {totalUsers > 0 ? Math.round((usersWithPermissions / totalUsers) * 100) : 0}%
            </div>
            <Progress 
              value={totalUsers > 0 ? (usersWithPermissions / totalUsers) * 100 : 0} 
              className="mt-2"
            />
          </CardContent>
        </Card>
      </div>

      {/* الصلاحيات الأكثر استخداماً */}
      <Card>
        <CardHeader>
          <CardTitle>الصلاحيات الأكثر استخداماً</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mostUsedPermissions.map(([permission, count]) => {
              const percentage = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
              const permissionName = permission
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

      {/* توزيع الأدوار */}
      <Card>
        <CardHeader>
          <CardTitle>توزيع الأدوار</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(roleStats).map(([role, count]) => {
              const roleNames: Record<string, string> = {
                'super_admin': 'سوبر أدمن',
                'admin': 'أدمن',
                'manager': 'مدير',
                'sales_agent': 'مندوب مبيعات',
                'accountant': 'محاسب',
                'viewer': 'مشاهد',
                'no_role': 'بدون دور'
              };
              
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
              <p>
                • يوجد {usersWithoutPermissions} مستخدم بدون صلاحيات محددة
              </p>
              <p>
                • يُنصح بمراجعة وتعيين الصلاحيات المناسبة لكل مستخدم
              </p>
              <p>
                • استخدم القوالب الجاهزة لتسريع عملية تعيين الصلاحيات
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedPermissionsOverview;
