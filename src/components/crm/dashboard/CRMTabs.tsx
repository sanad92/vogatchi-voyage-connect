
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Target, Send, MessageSquare, Brain, Users } from 'lucide-react';
import CustomerAnalytics from '../CustomerAnalytics';
import SmartSegmentation from '../SmartSegmentation';
import MarketingCampaigns from '../MarketingCampaigns';
import CustomerInteractions from '../CustomerInteractions';
import CRMInsights from './CRMInsights';
import CRMAutomation from './CRMAutomation';

interface CRMTabsProps {
  timeframe: '7d' | '30d' | '90d' | '1y';
}

const CRMTabs = ({ timeframe }: CRMTabsProps) => {
  return (
    <Tabs defaultValue="analytics" className="space-y-6">
      <TabsList className="grid w-full grid-cols-6">
        <TabsTrigger value="analytics" className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">التحليلات</span>
        </TabsTrigger>
        <TabsTrigger value="segmentation" className="flex items-center gap-2">
          <Target className="h-4 w-4" />
          <span className="hidden sm:inline">التجزئة</span>
        </TabsTrigger>
        <TabsTrigger value="campaigns" className="flex items-center gap-2">
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">الحملات</span>
        </TabsTrigger>
        <TabsTrigger value="interactions" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="hidden sm:inline">التفاعلات</span>
        </TabsTrigger>
        <TabsTrigger value="insights" className="flex items-center gap-2">
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">الرؤى الذكية</span>
        </TabsTrigger>
        <TabsTrigger value="automation" className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">الأتمتة</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="analytics">
        <CustomerAnalytics timeframe={timeframe} />
      </TabsContent>

      <TabsContent value="segmentation">
        <SmartSegmentation />
      </TabsContent>

      <TabsContent value="campaigns">
        <MarketingCampaigns />
      </TabsContent>

      <TabsContent value="interactions">
        <CustomerInteractions />
      </TabsContent>

      <TabsContent value="insights">
        <CRMInsights />
      </TabsContent>

      <TabsContent value="automation">
        <CRMAutomation />
      </TabsContent>
    </Tabs>
  );
};

export default CRMTabs;
