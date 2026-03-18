import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Star, Target, Award } from 'lucide-react';
import { useCRM } from '@/hooks/useCRM';
import { useNotifications } from '@/hooks/useNotifications';

interface CRMStatsCardsProps {
  customers: any[] | undefined;
  realStats: {
    totalBookings: number;
    totalRevenue: number;
    activeCustomers: number;
    monthlyGrowth: number;
  };
}

const CRMStatsCards = ({ customers, realStats }: CRMStatsCardsProps) => {
  const { customerSegments } = useCRM();
  const { unreadCount } = useNotifications();

  const calculateCRMStats = () => {
    if (!customers || !customerSegments) return { vipCustomers: 0, loyaltyPoints: 0 };

    const vipSegment = customerSegments.find((segment) => segment.name === 'VIP' || segment.name_ar === 'VIP');
    const vipCustomers = vipSegment
      ? customers.filter((customer) => customer.segment_id === vipSegment.id).length
      : customers.filter((customer) => (customer.total_bookings || 0) >= 10).length;

    const loyaltyPoints = customers.reduce((sum, customer) => sum + (customer.loyalty_points || 0), 0);

    return { vipCustomers, loyaltyPoints };
  };

  const crmStats = calculateCRMStats();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{'\u0639\u0645\u0644\u0627\u0621 VIP'}</CardTitle>
          <Star className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{crmStats.vipCustomers}</div>
          <p className="text-xs text-muted-foreground">
            {'\u0645\u0646 \u0625\u062c\u0645\u0627\u0644\u064a '} {realStats.activeCustomers} {'\u0639\u0645\u064a\u0644'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{'\u0646\u0642\u0627\u0637 \u0627\u0644\u0648\u0644\u0627\u0621 \u0627\u0644\u0625\u062c\u0645\u0627\u0644\u064a\u0629'}</CardTitle>
          <Award className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{crmStats.loyaltyPoints.toLocaleString('ar-EG')}</div>
          <p className="text-xs text-muted-foreground">{'\u0646\u0642\u0637\u0629 \u0648\u0644\u0627\u0621 \u0646\u0634\u0637\u0629'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{'\u0645\u062a\u0648\u0633\u0637 \u0642\u064a\u0645\u0629 \u0627\u0644\u062d\u062c\u0632'}</CardTitle>
          <Target className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {realStats.totalBookings > 0
              ? (realStats.totalRevenue / realStats.totalBookings).toLocaleString('ar-EG', {
                  maximumFractionDigits: 0,
                })
              : 0}{' '}
            {'\u062c.\u0645'}
          </div>
          <p className="text-xs text-muted-foreground">{'\u0645\u062a\u0648\u0633\u0637 \u0642\u064a\u0645\u0629 \u0627\u0644\u062d\u062c\u0632'}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{'\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062a'}</CardTitle>
          <Bell className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unreadCount || 0}</div>
          <p className="text-xs text-muted-foreground">{'\u0625\u0634\u0639\u0627\u0631 \u063a\u064a\u0631 \u0645\u0642\u0631\u0648\u0621'}</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default CRMStatsCards;
