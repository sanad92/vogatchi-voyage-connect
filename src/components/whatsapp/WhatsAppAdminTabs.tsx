import React from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Settings,
  MessageSquare,
  FileText,
  Zap,
  BarChart3,
  Users,
  Clock,
  Megaphone,
  Workflow,
  Bot,
  ExternalLink,
} from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import { usePageTitle } from '@/hooks/usePageTitle';
import { WhatsAppBroadcastManager } from './WhatsAppBroadcastManager';
import { WhatsAppSettings } from './WhatsAppSettings';
import { TemplateCenter } from './template-center/TemplateCenter';
import { WhatsAppQuickReplies } from './WhatsAppQuickReplies';
import { WhatsAppAnalyticsDashboard } from './WhatsAppAnalyticsDashboard';
import { WhatsAppEmployeeManagement } from './WhatsAppEmployeeManagement';
import { WhatsAppInboxList } from './WhatsAppInboxList';
import { WhatsAppSLASettings } from './WhatsAppSLASettings';
import { WhatsAppAutomationBuilder } from './WhatsAppAutomationBuilder';
import { WhatsAppChatbotSettings } from './WhatsAppChatbotSettings';
import { WhatsAppRoutingSettings } from './WhatsAppRoutingSettings';
import { ManualConnectDialog } from './ManualConnectDialog';

const TABS = [
  { value: 'settings', label: 'القنوات والخدمة', icon: Settings },
  { value: 'chatbot', label: 'البوت والأتمتة', icon: Bot },
  { value: 'templates', label: 'مركز القوالب', icon: FileText },
  { value: 'broadcasts', label: 'الحملات', icon: Megaphone },
  { value: 'employees', label: 'الفريق والتوزيع', icon: Users },
  { value: 'analytics', label: 'التحليلات', icon: BarChart3 },
];

export const WhatsAppAdminTabs: React.FC = () => {
  usePageTitle('واتساب');

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="إدارة WhatsApp Business"
        description="إعداد قنوات المراسلة، الأتمتة، القوالب، والحملات — كل ما يخص التواصل مع العملاء عبر واتساب."
        icon={MessageSquare}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to="/whatsapp-inbox" className="gap-1.5">
                <ExternalLink className="h-4 w-4" />
                <span className="hidden sm:inline">لوحة المحادثات</span>
              </Link>
            </Button>
            <ManualConnectDialog />
          </>
        }
      />

      <Tabs defaultValue="settings" className="w-full">
        {/* Horizontally scrollable tabs on small screens, wrap-free on desktop */}
        <div className="overflow-x-auto scrollbar-thin -mx-1 px-1">
          <TabsList className="inline-flex h-auto w-max lg:w-full lg:grid lg:grid-cols-6 gap-1 p-1 bg-muted/50">
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="flex items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent value="settings" className="mt-6 space-y-6 animate-in fade-in">
          <WhatsAppInboxList />
          <WhatsAppSettings />
          <WhatsAppSLASettings />
        </TabsContent>

        <TabsContent value="chatbot" className="mt-6 animate-in fade-in">
          <WhatsAppChatbotSettings />
          <section className="pt-6 border-t mt-6"><h2 className="font-bold mb-4">قواعد الأتمتة</h2><WhatsAppAutomationBuilder /></section>
        </TabsContent>

        <TabsContent value="templates" className="mt-6 animate-in fade-in">
          <TemplateCenter />
          <section className="pt-6 border-t mt-6"><h2 className="font-bold mb-4">الردود السريعة للموظفين</h2><WhatsAppQuickReplies /></section>
        </TabsContent>

        <TabsContent value="broadcasts" className="mt-6 animate-in fade-in">
          <WhatsAppBroadcastManager />
        </TabsContent>

        <TabsContent value="employees" className="mt-6 space-y-6 animate-in fade-in">
          <WhatsAppRoutingSettings />
          <WhatsAppEmployeeManagement />
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 animate-in fade-in">
          <WhatsAppAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};
