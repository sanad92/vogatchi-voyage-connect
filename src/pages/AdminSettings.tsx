
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import UserManagementTab from '@/components/admin/UserManagementTab';
import UnifiedUserEmployeeManagement from '@/components/admin/UnifiedUserEmployeeManagement';
import SuperAdminActions from '@/components/admin/SuperAdminActions';
import SiteSettings from '@/components/admin/SiteSettings';
import AuditLogTab from '@/components/admin/AuditLogTab';
import PerformanceMonitorTab from '@/components/admin/PerformanceMonitorTab';
import BackupManagementTab from '@/components/admin/BackupManagementTab';
import SecurityManagementTab from '@/components/admin/SecurityManagementTab';
import SystemSettingsTab from '@/components/admin/SystemSettingsTab';
import PermissionsTab from '@/components/admin/PermissionsTab';
import { 
  Settings, 
  Users, 
  UserCog, 
  Shield, 
  Database, 
  Activity, 
  Archive,
  Lock,
  Cog,
  KeyRound,
  Palette
} from 'lucide-react';

const AdminSettings = () => {
  const { hasRole, isSuperAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('unified-management');

  if (!hasRole('admin') && !hasRole('manager') && !isSuperAdmin()) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-4">ليس لديك صلاحية</h1>
          <p className="text-gray-600">هذه الصفحة متاحة للأدمن والمديرين فقط</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">إعدادات الإدارة</h1>
          <p className="text-gray-600">إدارة شاملة لجميع جوانب النظام والمستخدمين</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-10">
            <TabsTrigger value="unified-management" className="flex items-center gap-2 text-xs">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">الإدارة الموحدة</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 text-xs">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">المستخدمين</span>
            </TabsTrigger>
            <TabsTrigger value="super-admin" disabled={!isSuperAdmin()} className="flex items-center gap-2 text-xs">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">سوبر أدمن</span>
            </TabsTrigger>
            <TabsTrigger value="site" className="flex items-center gap-2 text-xs">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">الموقع</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2 text-xs">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">السجلات</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2 text-xs">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">الأداء</span>
            </TabsTrigger>
            <TabsTrigger value="backup" disabled={!isSuperAdmin()} className="flex items-center gap-2 text-xs">
              <Archive className="h-4 w-4" />
              <span className="hidden sm:inline">النسخ الاحتياطي</span>
            </TabsTrigger>
            <TabsTrigger value="security" disabled={!isSuperAdmin()} className="flex items-center gap-2 text-xs">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">الأمان</span>
            </TabsTrigger>
            <TabsTrigger value="system" disabled={!isSuperAdmin()} className="flex items-center gap-2 text-xs">
              <Cog className="h-4 w-4" />
              <span className="hidden sm:inline">النظام</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" disabled={!isSuperAdmin()} className="flex items-center gap-2 text-xs">
              <KeyRound className="h-4 w-4" />
              <span className="hidden sm:inline">الصلاحيات</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="unified-management">
            <UnifiedUserEmployeeManagement />
          </TabsContent>

          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>

          <TabsContent value="super-admin">
            <SuperAdminActions />
          </TabsContent>

          <TabsContent value="site">
            <SiteSettings />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogTab />
          </TabsContent>

          <TabsContent value="performance">
            <PerformanceMonitorTab />
          </TabsContent>

          <TabsContent value="backup">
            <BackupManagementTab />
          </TabsContent>

          <TabsContent value="security">
            <SecurityManagementTab />
          </TabsContent>

          <TabsContent value="system">
            <SystemSettingsTab />
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminSettings;
