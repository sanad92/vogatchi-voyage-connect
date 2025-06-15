
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import UserManagementTab from "@/components/admin/UserManagementTab";
import SystemSettingsTab from "@/components/admin/SystemSettingsTab";
import PermissionsTab from "@/components/admin/PermissionsTab";
import AuditLogTab from "@/components/admin/AuditLogTab";
import BackupManagementTab from "@/components/admin/BackupManagementTab";
import PerformanceMonitorTab from "@/components/admin/PerformanceMonitorTab";
import SecurityManagementTab from "@/components/admin/SecurityManagementTab";
import AdvancedUserManagementTab from "@/components/admin/AdvancedUserManagementTab";
import SuperAdminBanner from "@/components/admin/SuperAdminBanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  Settings, 
  Shield, 
  FileText, 
  Database, 
  Activity,
  Lock,
  UserCog
} from "lucide-react";

const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <SuperAdminBanner />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">إعدادات الإدارة المتقدمة</h1>
        <p className="text-gray-600">
          لوحة تحكم شاملة لإدارة النظام والمستخدمين والأمان والأداء
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border p-2">
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8 gap-1">
            <TabsTrigger value="users" className="flex items-center gap-2 text-xs lg:text-sm">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">المستخدمين</span>
            </TabsTrigger>
            <TabsTrigger value="advanced-users" className="flex items-center gap-2 text-xs lg:text-sm">
              <UserCog className="h-4 w-4" />
              <span className="hidden sm:inline">إدارة متقدمة</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2 text-xs lg:text-sm">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">الإعدادات</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2 text-xs lg:text-sm">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">الصلاحيات</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2 text-xs lg:text-sm">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">الأمان</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2 text-xs lg:text-sm">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">الأداء</span>
            </TabsTrigger>
            <TabsTrigger value="backups" className="flex items-center gap-2 text-xs lg:text-sm">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">النسخ الاحتياطية</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2 text-xs lg:text-sm">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">سجل العمليات</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-[600px]">
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  إدارة المستخدمين الأساسية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UserManagementTab />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="advanced-users" className="space-y-6">
            <AdvancedUserManagementTab />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <SystemSettingsTab />
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <PermissionsTab />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <SecurityManagementTab />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <PerformanceMonitorTab />
          </TabsContent>

          <TabsContent value="backups" className="space-y-6">
            <BackupManagementTab />
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  سجل عمليات النظام
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AuditLogTab />
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default AdminSettings;
