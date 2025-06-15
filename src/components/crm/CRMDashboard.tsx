
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Brain } from 'lucide-react';
import CRMOverview from './dashboard/CRMOverview';
import CRMTabs from './dashboard/CRMTabs';
import { useCRM } from '@/hooks/useCRM';

const CRMDashboard = () => {
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
            لوحة تحكم CRM المتقدمة
          </h1>
          <p className="text-gray-600 mt-2">تحليلات ذكية وإدارة متقدمة لعلاقات العملاء</p>
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

      <CRMOverview
        customerSegments={customerSegments}
        loyaltyRewards={loyaltyRewards}
        marketingCampaigns={marketingCampaigns}
      />

      <CRMTabs timeframe={timeframe} />
    </div>
  );
};

export default CRMDashboard;
