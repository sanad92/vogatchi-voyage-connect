
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Users, Shield, Activity, Building2, Database, Bell } from "lucide-react";
import SystemSettingsTab from "@/components/admin/SystemSettingsTab";
import UserManagementTab from "@/components/admin/UserManagementTab";
import AuditLogTab from "@/components/admin/AuditLogTab";
import PermissionsTab from "@/components/admin/PermissionsTab";

const AdminSettings = () => {
  const { userRole, isSuperAdmin } = useAuth();

  // التحقق من صلاحيات السوبر أدمن
  if (!isSuperAdmin()) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">غير مصرح</h2>
              <p className="text-gray-600">هذه الصفحة متاحة للسوبر أدمن فقط</p>
              <p className="text-sm text-gray-500 mt-2">دورك الحالي: {userRole}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* العنوان الرئيسي */}
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-blue-600 rounded-lg">
            <Settings className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">لوحة تحكم السوبر أدمن</h1>
            <p className="text-gray-600">إدارة شاملة لجميع إعدادات النظام والمستخدمين والصلاحيات</p>
          </div>
        </div>

        {/* معلومات سريعة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">إعدادات النظام</p>
                  <p className="text-lg font-bold">تخصيص كامل</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-gray-600">إدارة المستخدمين</p>
                  <p className="text-lg font-bold">تحكم كامل</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">إدارة الصلاحيات</p>
                  <p className="text-lg font-bold">مرونة عالية</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Activity className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-sm text-gray-600">مراقبة العمليات</p>
                  <p className="text-lg font-bold">أمان عالي</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* علامات التبويب */}
        <Tabs defaultValue="system" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-12">
            <TabsTrigger value="system" className="flex items-center gap-2 h-10">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">إعدادات النظام</span>
              <span className="sm:hidden">النظام</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2 h-10">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">إدارة المستخدمين</span>
              <span className="sm:hidden">المستخدمين</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2 h-10">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">الصلاحيات</span>
              <span className="sm:hidden">الصلاحيات</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2 h-10">
              <Activity className="h-4 w-4" />
              <span className="hidden sm:inline">سجل العمليات</span>
              <span className="sm:hidden">السجل</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <SystemSettingsTab />
            </div>
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <UserManagementTab />
            </div>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <PermissionsTab />
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <AuditLogTab />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminSettings;
