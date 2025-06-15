
import { Card, CardContent } from '@/components/ui/card';
import { Target, TrendingUp, PieChart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface CRMOverviewProps {
  customerSegments: any[] | undefined;
  loyaltyRewards: any[] | undefined;
  marketingCampaigns: any[] | undefined;
}

const CRMOverview = ({ customerSegments, loyaltyRewards, marketingCampaigns }: CRMOverviewProps) => {
  // جلب البيانات الحقيقية للعملاء
  const { data: customers } = useQuery({
    queryKey: ['crm-customers-overview'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('segment_id, loyalty_points, total_bookings')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // حساب إحصائيات حقيقية
  const calculateRealStats = () => {
    if (!customers) return { segmentedCustomers: 0, totalLoyaltyPoints: 0, activeSegments: 0 };

    const segmentedCustomers = customers.filter(c => c.segment_id).length;
    const totalLoyaltyPoints = customers.reduce((sum, c) => sum + (c.loyalty_points || 0), 0);
    const activeSegments = customerSegments?.filter(s => s.is_active).length || 0;

    return { segmentedCustomers, totalLoyaltyPoints, activeSegments };
  };

  const realStats = calculateRealStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">العملاء المقسمين</p>
              <p className="text-2xl font-bold">{realStats.segmentedCustomers}</p>
              <p className="text-xs text-green-600">من إجمالي {customers?.length || 0} عميل</p>
            </div>
            <Target className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">نقاط الولاء الإجمالية</p>
              <p className="text-2xl font-bold">{realStats.totalLoyaltyPoints.toLocaleString()}</p>
              <p className="text-xs text-blue-600">نقطة نشطة</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">القطاعات النشطة</p>
              <p className="text-2xl font-bold">{realStats.activeSegments}</p>
              <p className="text-xs text-purple-600">
                الحملات: {marketingCampaigns?.filter(c => c.status === 'active').length || 0}
              </p>
            </div>
            <PieChart className="h-8 w-8 text-purple-600" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMOverview;
