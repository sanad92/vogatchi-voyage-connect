
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, FileText, BarChart3 } from 'lucide-react';
import PermissionsMatrix from './permissions/PermissionsMatrix';
import PermissionTemplates from './permissions/PermissionTemplates';
import PermissionsOverview from './permissions/PermissionsOverview';

const PermissionsManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">إدارة الصلاحيات</h1>
          <p className="text-gray-600">نظام شامل لإدارة صلاحيات المستخدمين بطريقة مبسطة وواضحة</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            نظرة عامة
          </TabsTrigger>
          <TabsTrigger value="matrix" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
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
