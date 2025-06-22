
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  FileText, 
  Zap, 
  BarChart3,
  Users,
  MessageSquare
} from 'lucide-react';
import { WhatsAppSettings } from './WhatsAppSettings';
import { WhatsAppTemplateManager } from './WhatsAppTemplateManager';
import { WhatsAppQuickReplies } from './WhatsAppQuickReplies';
import { WhatsAppAnalyticsDashboard } from './WhatsAppAnalyticsDashboard';
import { WhatsAppEmployeeManagement } from './WhatsAppEmployeeManagement';
import { WhatsAppDashboard } from './WhatsAppDashboard';

export const WhatsAppAdminTabs: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">إدارة WhatsApp Business</h1>
        <p className="text-gray-600 mt-2">
          نظام إدارة شامل لـ WhatsApp Business API مع التحكم الكامل في الإعدادات والمحادثات
        </p>
      </div>

      <Tabs defaultValue="dashboard" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            المحادثات
          </TabsTrigger>
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
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            الإحصائيات
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            الموظفين
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <WhatsAppDashboard />
        </TabsContent>

        <TabsContent value="settings">
          <WhatsAppSettings />
        </TabsContent>

        <TabsContent value="templates">
          <WhatsAppTemplateManager />
        </TabsContent>

        <TabsContent value="quick-replies">
          <WhatsAppQuickReplies />
        </TabsContent>

        <TabsContent value="analytics">
          <WhatsAppAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="employees">
          <WhatsAppEmployeeManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};
