
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  MessageSquare, 
  FileText, 
  Zap,
  BarChart3,
  Users
} from 'lucide-react';
import { WhatsAppSettings } from './WhatsAppSettings';
import { WhatsAppTemplateManager } from './WhatsAppTemplateManager';
import { WhatsAppQuickReplies } from './WhatsAppQuickReplies';
import { WhatsAppAnalyticsDashboard } from './WhatsAppAnalyticsDashboard';
import { WhatsAppEmployeeManagement } from './WhatsAppEmployeeManagement';
import { WhatsAppConnectCard } from './WhatsAppConnectCard';

export const WhatsAppAdminTabs: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">إدارة WhatsApp Business</h1>
        <p className="text-gray-600 mt-2">
          إعداد وإدارة خدمة WhatsApp Business للتواصل مع العملاء
        </p>
      </div>

      <Tabs defaultValue="settings" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            الإعدادات
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            القوالب
          </TabsTrigger>
          <TabsTrigger value="quick-replies" className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            الردود السريعة
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            إدارة الموظفين
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            التحليلات
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            لوحة المحادثات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="mt-6">
          <WhatsAppSettings />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <WhatsAppTemplateManager />
        </TabsContent>

        <TabsContent value="quick-replies" className="mt-6">
          <WhatsAppQuickReplies />
        </TabsContent>

        <TabsContent value="employees" className="mt-6">
          <WhatsAppEmployeeManagement />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <WhatsAppAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="dashboard" className="mt-6">
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">لوحة المحادثات</h3>
            <p className="text-gray-500 mb-4">
              يمكن الوصول إلى لوحة المحادثات من الصفحة الرئيسية
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
