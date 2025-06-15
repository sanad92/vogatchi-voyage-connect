
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCRM } from '@/hooks/useCRM';
import { useCustomers } from '@/hooks/useCustomers';
import AnalyticsKPIs from './analytics/AnalyticsKPIs';
import AdvancedMetrics from './analytics/AdvancedMetrics';
import SegmentAnalysis from './analytics/SegmentAnalysis';

interface CustomerAnalyticsProps {
  timeframe?: '7d' | '30d' | '90d' | '1y';
}

const CustomerAnalytics = ({ timeframe = '30d' }: CustomerAnalyticsProps) => {
  const { customers } = useCustomers();
  const { customerSegments } = useCRM();

  // حساب تحليلات العملاء
  const analytics = {
    totalCustomers: customers?.length || 0,
    newCustomers: customers?.filter(c => {
      const createdAt = new Date(c.created_at);
      const daysAgo = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
      return createdAt > new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    }).length || 0,
    activeCustomers: customers?.filter(c => 
      c.last_booking_date && new Date(c.last_booking_date) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
    ).length || 0,
    totalRevenue: customers?.reduce((sum, c) => sum + (c.total_spent || 0), 0) || 0,
    averageOrderValue: customers?.length > 0 ? 
      (customers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / customers.length) : 0,
    retentionRate: 75.5,
    customerLifetimeValue: 18500,
    churnRate: 12.3
  };

  return (
    <div className="space-y-6">
      <AnalyticsKPIs analytics={analytics} />
      <AdvancedMetrics analytics={analytics} />
      <SegmentAnalysis customerSegments={customerSegments} customers={customers} />
    </div>
  );
};

export default CustomerAnalytics;
