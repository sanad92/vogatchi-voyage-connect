
import { Card, CardContent } from '@/components/ui/card';
import { Target, Play, Eye, TrendingUp } from 'lucide-react';
import type { CampaignSend, MarketingCampaign } from '@/types/crm';
import { buildCampaignDeliveryMetrics } from '@/lib/campaignMetrics';

interface CampaignStatsProps {
  marketingCampaigns: MarketingCampaign[] | undefined;
  campaignSends: CampaignSend[] | undefined;
}

const CampaignStats = ({ marketingCampaigns, campaignSends }: CampaignStatsProps) => {
  const deliveryMetrics = buildCampaignDeliveryMetrics(campaignSends);
  const deliveryHint = deliveryMetrics.deliveredCount > 0
    ? `من ${deliveryMetrics.deliveredCount} رسالة مسلمة`
    : 'لا توجد بيانات إرسال';

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الحملات</p>
              <p className="text-2xl font-bold">{marketingCampaigns?.length || 0}</p>
            </div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">الحملات النشطة</p>
              <p className="text-2xl font-bold">
                {marketingCampaigns?.filter(c => c.status === 'active').length || 0}
              </p>
            </div>
            <Play className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">معدل القراءة</p>
              <p className="text-2xl font-bold">{deliveryMetrics.readRate}%</p>
              <p className="text-xs text-muted-foreground">{deliveryHint}</p>
            </div>
            <Eye className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">معدل الاستجابة</p>
              <p className="text-2xl font-bold">{deliveryMetrics.responseRate}%</p>
              <p className="text-xs text-muted-foreground">{deliveryHint}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CampaignStats;
