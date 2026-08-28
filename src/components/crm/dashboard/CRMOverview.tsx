
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, Star, Send } from 'lucide-react';
import { CustomerSegment, LoyaltyReward, MarketingCampaign } from '@/types/crm';
import { useCustomers } from '@/hooks/useCustomers';
import { customerGrowthRate } from '@/lib/customerMetrics';

interface CRMOverviewProps {
  customerSegments?: CustomerSegment[];
  loyaltyRewards?: LoyaltyReward[];
  marketingCampaigns?: MarketingCampaign[];
}

const CRMOverview = ({ customerSegments, loyaltyRewards, marketingCampaigns }: CRMOverviewProps) => {
  const { customers } = useCustomers();
  const growthRate = customerGrowthRate(customers || []);
  const stats = {
    totalSegments: customerSegments?.length || 0,
    activeRewards: loyaltyRewards?.filter(r => r.is_active).length || 0,
    activeCampaigns: marketingCampaigns?.filter(c => c.status === 'active').length || 0,
    totalCampaigns: marketingCampaigns?.length || 0
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">شرائح العملاء</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalSegments}</div>
          <p className="text-xs text-muted-foreground">شريحة نشطة</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">مكافآت الولاء</CardTitle>
          <Star className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeRewards}</div>
          <p className="text-xs text-muted-foreground">مكافأة متاحة</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">الحملات النشطة</CardTitle>
          <Send className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.activeCampaigns}</div>
          <p className="text-xs text-muted-foreground">من أصل {stats.totalCampaigns}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">معدل النمو</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {growthRate === null ? '—' : `${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`}
          </div>
          <p className="text-xs text-muted-foreground">
            {growthRate === null ? 'لا توجد فترة سابقة كافية للمقارنة' : 'الـ30 يوم الحالية مقابل السابقة'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMOverview;
