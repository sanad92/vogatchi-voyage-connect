
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCRM } from '@/hooks/useCRM';
import { useCustomers } from '@/hooks/useCustomers';
import AnalyticsKPIs from './analytics/AnalyticsKPIs';
import AdvancedMetrics from './analytics/AdvancedMetrics';
import SegmentAnalysis from './analytics/SegmentAnalysis';
import { buildCustomerAnalytics } from '@/lib/customerMetrics';

interface CustomerAnalyticsProps {
  timeframe?: '7d' | '30d' | '90d' | '1y';
}

const CustomerAnalytics = ({ timeframe = '30d' }: CustomerAnalyticsProps) => {
  const { customers } = useCustomers();
  const { customerSegments } = useCRM();

  const daysAgo = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
  const analytics = buildCustomerAnalytics(customers || [], daysAgo);

  return (
    <div className="space-y-6">
      <AnalyticsKPIs analytics={analytics} />
      <AdvancedMetrics analytics={analytics} />
      <SegmentAnalysis customerSegments={customerSegments} customers={customers} />
    </div>
  );
};

export default CustomerAnalytics;
