
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, Users, Eye, Edit, AlertTriangle } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useUnifiedData } from '@/hooks/useUnifiedData';

const PermissionsOverview = () => {
  const { allPermissions } = useUserPermissions();
  const { unifiedUsers } = useUnifiedData();

  // حساب الإحصائيات
  const totalUsers = unifiedUsers?.length || 0;
  const usersWithPermissions = allPermissions?.length || 0;
  const usersWithoutPermissions = totalUsers - usersWithPermissions;

  // حساب إجمالي الصلاحيات
  const calculatePermissionStats = () => {
    if (!allPermissions || allPermissions.length === 0) {
      return { readPermissions: 0, writePermissions: 0, totalPossible: 0 };
    }

    const permissionKeys = [
      'customers', 'bookings', 'suppliers', 'invoices', 
      'reports', 'employees', 'expenses', 'users', 'settings'
    ];

    let totalReadPermissions = 0;
    let totalWritePermissions = 0;

    allPermissions.forEach(userPermissions => {
      permissionKeys.forEach(key => {
        if (userPermissions[`${key}_read` as keyof typeof userPermissions]) {
          totalReadPermissions++;
        }
        if (userPermissions[`${key}_write` as keyof typeof userPermissions]) {
          totalWritePermissions++;
        }
      });
    });

    const totalPossible = usersWithPermissions * permissionKeys.length;

    return {
      readPermissions: totalReadPermissions,
      writePermissions: totalWritePermissions,
      totalPossible
    };
  };

  const stats = calculatePermissionStats();
  const readPercentage = stats.totalPossible > 0 ? (stats.readPermissions / stats.totalPossible) * 100 : 0;
  const writePercentage = stats.totalPossible > 0 ? (stats.writePermissions / stats.totalPossible) * 100 : 0;

  // حساب المستخدمين حسب مستوى الصلاحيات
  const getUserPermissionLevel = () => {
    if (!allPermissions) return { noAccess: 0, limited: 0, moderate: 0, full: 0 };

    let noAccess = 0;
    let limited = 0;
    let moderate = 0;
    let full = 0;

    allPermissions.forEach(userPermissions => {
      const totalPermissions = Object.values(userPermissions).filter(
        (value, index, array) => typeof value === 'boolean' && value
      ).length;

      if (totalPermissions === 0) noAccess++;
      else if (totalPermissions <= 6) limited++;
      else if (totalPermissions <= 12) moderate++;
      else full++;
    });

    return { noAccess, limited, moderate, full };
  };

  const permissionLevels = getUserPermissionLevel();

  return (
    <div className="space-y-6">
      {/* الإحصائيات الأساسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold text-gray-900">{totalUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">لديهم صلاحيات</p>
                <p className="text-2xl font-bold text-gray-900">{usersWithPermissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">بدون صلاحيات</p>
                <p className="text-2xl font-bold text-gray-900">{usersWithoutPermissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">صلاحيات القراءة</p>
                <p className="text-2xl font-bold text-gray-900">{stats.readPermissions}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* توزيع الصلاحيات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              توزيع الصلاحيات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">صلاحيات القراءة</span>
                <span className="text-sm text-gray-600">{readPercentage.toFixed(1)}%</span>
              </div>
              <Progress value={readPercentage} className="h-2" />
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">صلاحيات الكتابة</span>
                <span className="text-sm text-gray-600">{writePercentage.toFixed(1)}%</span>
              </div>
              <Progress value={writePercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>مستويات الصلاحيات</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">بدون صلاحيات</span>
              <Badge variant="destructive">{permissionLevels.noAccess}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">صلاحيات محدودة</span>
              <Badge variant="secondary">{permissionLevels.limited}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">صلاحيات متوسطة</span>
              <Badge variant="default">{permissionLevels.moderate}</Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm">صلاحيات كاملة</span>
              <Badge className="bg-green-600">{permissionLevels.full}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تحذيرات */}
      {usersWithoutPermissions > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <h4 className="font-medium text-orange-800">تنبيه</h4>
                <p className="text-sm text-orange-700">
                  يوجد {usersWithoutPermissions} مستخدم بدون صلاحيات محددة. 
                  قم بتعيين الصلاحيات المناسبة لهم.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PermissionsOverview;
