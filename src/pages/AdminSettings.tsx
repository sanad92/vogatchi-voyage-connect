
import { useState } from 'react';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Shield } from 'lucide-react';
import UserManagementTab from '@/components/admin/UserManagementTab';
import UnifiedUserEmployeeManagement from '@/components/admin/UnifiedUserEmployeeManagement';
import SiteSettings from '@/components/admin/SiteSettings';
import LandingPageCMS from '@/components/admin/LandingPageCMS';
import AuditLogTab from '@/components/admin/AuditLogTab';
import PerformanceMonitorTab from '@/components/admin/PerformanceMonitorTab';
import BackupManagementTab from '@/components/admin/BackupManagementTab';
import SecurityManagementTab from '@/components/admin/SecurityManagementTab';
import SystemSettingsTab from '@/components/admin/SystemSettingsTab';
import PermissionsManagement from '@/components/admin/PermissionsManagement';
import EnhancedAdminTabs from '@/components/admin/EnhancedAdminTabs';

const AdminSettings = () => {
  const { hasRole, isSuperAdmin } = useOptimizedAuth();
  const [activeTab, setActiveTab] = useState('unified-management');

  if (!hasRole('admin') && !hasRole('manager') && !isSuperAdmin()) {
    return (
      <div className="w-full px-4 md:px-6 lg:px-8 py-8">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-gradient-to-br from-red-100 to-red-200 rounded-full flex items-center justify-center mx-auto">
              <Shield className="h-12 w-12 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">ليس لديك صلاحية</h1>
              <p className="text-muted-foreground max-w-md mx-auto">
                هذه الصفحة متاحة للأدمن والمديرين فقط. يرجى التواصل مع المدير للحصول على الصلاحيات المطلوبة.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          {/* Enhanced Admin Tabs */}
          <EnhancedAdminTabs 
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isSuperAdmin={isSuperAdmin()}
          />

          {/* Tab Contents */}
          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <TabsContent value="unified-management" className="mt-0">
              <UnifiedUserEmployeeManagement />
            </TabsContent>

            <TabsContent value="users" className="mt-0">
              <UserManagementTab />
            </TabsContent>

            <TabsContent value="site" className="mt-0">
              <SiteSettings />
            </TabsContent>

            <TabsContent value="audit" className="mt-0">
              <AuditLogTab />
            </TabsContent>

            <TabsContent value="performance" className="mt-0">
              <PerformanceMonitorTab />
            </TabsContent>

            <TabsContent value="backup" className="mt-0">
              <BackupManagementTab />
            </TabsContent>

            <TabsContent value="security" className="mt-0">
              <SecurityManagementTab />
            </TabsContent>

            <TabsContent value="system" className="mt-0">
              <SystemSettingsTab />
            </TabsContent>

            <TabsContent value="permissions" className="mt-0">
              <PermissionsManagement />
            </TabsContent>

            <TabsContent value="landing" className="mt-0">
              <LandingPageCMS />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminSettings;
