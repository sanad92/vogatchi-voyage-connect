import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Brain, Users, TrendingUp, Calendar, Send, MessageSquare, AlertTriangle, Plus } from 'lucide-react';
import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import CRMStats from './dashboard/CRMStats';
import CRMOverview from './dashboard/CRMOverview';
import CustomerSegments from './segments/CustomerSegments';
import CustomerFollowUps from './followups/CustomerFollowUps';
import CustomerAnalytics from './CustomerAnalytics';
import MarketingCampaigns from './MarketingCampaigns';
import CustomerInteractions from './CustomerInteractions';
import CRMCustomerList from './dashboard/CRMCustomerList';
import { useCRM } from '@/hooks/useCRM';

export const CRMDashboard = () => {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const { customerSegments, loyaltyRewards, marketingCampaigns } = useCRM();
  const navigate = useNavigate();

  const timeframeOptions = [
    { value: '7d', label: 'آخر 7 أيام' },
    { value: '30d', label: 'آخر 30 يوم' },
    { value: '90d', label: 'آخر 90 يوم' },
    { value: '1y', label: 'آخر سنة' }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BreadcrumbNav items={[
        { label: 'الرئيسية', href: '/dashboard' },
        { label: 'إدارة علاقات العملاء' }
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Brain className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            نظام إدارة علاقات العملاء
          </h1>
          <p className="text-muted-foreground mt-2">إدارة شاملة ومتقدمة لعلاقات العملاء والتحليلات الذكية</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/duplicate-customers')}>
            <AlertTriangle className="h-4 w-4 ml-2" />
            <span className="hidden sm:inline">كشف المكررات</span>
          </Button>
          <Button size="sm" onClick={() => navigate('/new-customer')}>
            <Plus className="h-4 w-4 ml-2" />
            عميل جديد
          </Button>
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-32 sm:w-40">
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

      <CRMStats />
      <CRMOverview
        customerSegments={customerSegments}
        loyaltyRewards={loyaltyRewards}
        marketingCampaigns={marketingCampaigns}
      />

      <Tabs defaultValue="customers" className="space-y-6">
        <div className="overflow-x-auto">
          <TabsList className="flex w-max lg:w-full lg:grid lg:grid-cols-6 gap-1">
            <TabsTrigger value="customers" className="flex items-center gap-2 whitespace-nowrap px-3">
              <Users className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">العملاء</span>
            </TabsTrigger>
            <TabsTrigger value="segments" className="flex items-center gap-2 whitespace-nowrap px-3">
              <Users className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">الشرائح</span>
            </TabsTrigger>
            <TabsTrigger value="followups" className="flex items-center gap-2 whitespace-nowrap px-3">
              <Calendar className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">المتابعة</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center gap-2 whitespace-nowrap px-3">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">التحليلات</span>
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2 whitespace-nowrap px-3">
              <Send className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">الحملات</span>
            </TabsTrigger>
            <TabsTrigger value="interactions" className="flex items-center gap-2 whitespace-nowrap px-3">
              <MessageSquare className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">التفاعلات</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="customers">
          <CRMCustomerList />
        </TabsContent>

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
