
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain, Users, TrendingUp, Calendar, Send, MessageSquare } from 'lucide-react';
import CRMStats from './dashboard/CRMStats';
import CRMOverview from './dashboard/CRMOverview';
import CustomerSegments from './segments/CustomerSegments';
import CustomerFollowUps from './followups/CustomerFollowUps';
import CustomerAnalytics from './CustomerAnalytics';
import MarketingCampaigns from './MarketingCampaigns';
import CustomerInteractions from './CustomerInteractions';
import { useCRM } from '@/hooks/useCRM';

export const CRMDashboard = () => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const { customerSegments, loyaltyRewards, marketingCampaigns } = useCRM();

  const timeframeOptions = [
    { value: '7d', label: 'آخر 7 أيام' },
    { value: '30d', label: 'آخر 30 يوم' },
    { value: '90d', label: 'آخر 90 يوم' },
    { value: '1y', label: 'آخر سنة' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            نظام إدارة علاقات العملاء
          </h1>
          <p className="text-gray-600 mt-2">إدارة شاملة ومتقدمة لعلاقات العملاء والتحليلات الذكية</p>
        </div>
        
        <div className="flex items-center gap-4">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {timeframeOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* إحصائيات CRM الرئيسية */}
      <CRMStats />

      {/* نظرة عامة */}
      <CRMOverview
        customerSegments={customerSegments}
        loyaltyRewards={loyaltyRewards}
        marketingCampaigns={marketingCampaigns}
      />

      {/* التبويبات الرئيسية */}
      <Tabs defaultValue="segments" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="segments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">شرائح العملاء</span>
          </TabsTrigger>
          <TabsTrigger value="followups" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">المتابعة</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">التحليلات</span>
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">الحملات</span>
          </TabsTrigger>
          <TabsTrigger value="interactions" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">التفاعلات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="segments">
          <CustomerSegments />
        </TabsContent>

        <TabsContent value="followups">
          <CustomerFollowUps />
        </TabsContent>

        <TabsContent value="analytics">
          <CustomerAnalytics timeframe={timeframe} />
        </TabsContent>

        <TabsContent value="campaigns">
          <MarketingCampaigns />
        </TabsContent>

        <TabsContent value="interactions">
          <CustomerInteractions />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CRMDashboard;
