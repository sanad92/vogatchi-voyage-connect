
import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, PieChart } from 'lucide-react';

interface CRMOverviewProps {
  customerSegments: any[] | undefined;
  loyaltyRewards: any[] | undefined;
  marketingCampaigns: any[] | undefined;
}

const CRMOverview = ({ customerSegments, loyaltyRewards, marketingCampaigns }: CRMOverviewProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">قطاعات العملاء</p>
              <p className="text-2xl font-bold">{customerSegments?.length || 0}</p>
              <p className="text-xs text-green-600">+2 هذا الشهر</p>
            </div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">مكافآت الولاء</p>
              <p className="text-2xl font-bold">{loyaltyRewards?.length || 0}</p>
              <p className="text-xs text-blue-600">نشطة</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
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
              <p className="text-xs text-purple-600">قيد التشغيل</p>
            </div>
            <PieChart className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMOverview;
