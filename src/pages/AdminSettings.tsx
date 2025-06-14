
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/use-toast";
import { Settings, Users, Shield, Activity, Building2 } from "lucide-react";
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
          <Settings className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">إعدادات النظام</h1>
            <p className="text-gray-600">إدارة شاملة لجميع إعدادات النظام</p>
          </div>
        </div>

        {/* علامات التبويب */}
        <Tabs defaultValue="system" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              إعدادات النظام
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              إدارة المستخدمين
            </TabsTrigger>
            <TabsTrigger value="permissions" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              الصلاحيات
            </TabsTrigger>
            <TabsTrigger value="audit" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              سجل العمليات
            </TabsTrigger>
          </TabsList>

          <TabsContent value="system">
            <SystemSettingsTab />
          </TabsContent>

          <TabsContent value="users">
            <UserManagementTab />
          </TabsContent>

          <TabsContent value="permissions">
            <PermissionsTab />
          </TabsContent>

          <TabsContent value="audit">
            <AuditLogTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminSettings;
