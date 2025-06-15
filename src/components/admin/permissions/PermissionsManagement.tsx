
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Grid, BarChart3, FileText, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDetailedPermissions } from '@/hooks/useDetailedPermissions';
import { useUnifiedData } from '@/hooks/useUnifiedData';
import PermissionsOverview from './PermissionsOverview';
import PermissionsMatrix from './PermissionsMatrix';
import PermissionTemplates from './PermissionTemplates';
import { toast } from 'sonner';

const PermissionsManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isUpdatingPermissions, setIsUpdatingPermissions] = useState(false);
  
  const { allUserPermissions, createDefaultPermissions, isLoading } = useDetailedPermissions();
  const { unifiedUsers } = useUnifiedData();

  // البحث عن المستخدمين بدون صلاحيات
  const usersWithoutPermissions = unifiedUsers?.filter(user => 
    !allUserPermissions?.some(perm => perm.user_id === user.id)
  ) || [];

  const handleCreateDefaultPermissions = async () => {
    if (usersWithoutPermissions.length === 0) {
      toast.info('جميع المستخدمين لديهم صلاحيات بالفعل');
      return;
    }

    setIsUpdatingPermissions(true);
    
    try {
      for (const user of usersWithoutPermissions) {
        await createDefaultPermissions(user.id, user.role || 'viewer');
      }
      toast.success(`تم إنشاء صلاحيات افتراضية لـ ${usersWithoutPermissions.length} مستخدم`);
    } catch (error) {
      console.error('Error creating default permissions:', error);
      toast.error('حدث خطأ أثناء إنشاء الصلاحيات الافتراضية');
    } finally {
      setIsUpdatingPermissions(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-blue-600" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">إدارة الصلاحيات المحسنة</h1>
          <p className="text-gray-600">نظام شامل لإدارة صلاحيات المستخدمين بطريقة مبسطة وواضحة</p>
        </div>
      </div>

      {/* تنبيه للمستخدمين بدون صلاحيات */}
      {usersWithoutPermissions.length > 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="flex items-center justify-between">
            <div className="text-orange-800">
              يوجد {usersWithoutPermissions.length} مستخدم بدون صلاحيات محددة. يجب تعيين صلاحيات لهم للوصول للنظام.
            </div>
            <Button 
              size="sm"
              onClick={handleCreateDefaultPermissions}
              disabled={isUpdatingPermissions}
              className="ml-4"
            >
              <Users className="h-4 w-4 mr-2" />
              {isUpdatingPermissions ? 'جاري الإنشاء...' : 'إنشاء صلاحيات افتراضية'}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">إجمالي المستخدمين</p>
                <p className="text-2xl font-bold text-gray-900">{unifiedUsers?.length || 0}</p>
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
                <p className="text-2xl font-bold text-gray-900">{allUserPermissions?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">بدون صلاحيات</p>
                <p className="text-2xl font-bold text-gray-900">{usersWithoutPermissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Grid className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">المستخدمين النشطين</p>
                <p className="text-2xl font-bold text-gray-900">
                  {unifiedUsers?.filter(user => user.is_active).length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Grid className="h-4 w-4" />
            مصفوفة الصلاحيات
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            القوالب الجاهزة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <PermissionsOverview />
        </TabsContent>

        <TabsContent value="matrix" className="mt-6">
          <PermissionsMatrix />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <PermissionTemplates />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PermissionsManagement;
