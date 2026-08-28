
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrencyTotals, getCustomerSpend, sumCurrencyTotals } from '@/lib/customerMetrics';
import type { CustomerSegment } from '@/types/crm';
import type { Customer } from '@/types/customer';

interface SegmentAnalysisProps {
  customerSegments: CustomerSegment[] | undefined;
  customers: Customer[] | undefined;
}

const SegmentAnalysis = ({ customerSegments, customers }: SegmentAnalysisProps) => {
  // تحليل توزيع العملاء حسب القطاعات
  const segmentAnalysis = customerSegments?.map(segment => {
    const segmentCustomers = customers?.filter(c => c.segment_id === segment.id) || [];
    return {
      ...segment,
      customerCount: segmentCustomers.length,
      totalRevenue: sumCurrencyTotals(segmentCustomers.map(getCustomerSpend)),
    };
  }) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>تحليل القطاعات</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">القيم حسب الحجوزات المؤكدة، والعملات منفصلة.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {segmentAnalysis.map((segment) => (
            <div key={segment.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: segment.color }}
                />
                <div>
                  <h4 className="font-medium">{segment.name_ar}</h4>
                  <p className="text-sm text-gray-600">{segment.customerCount} عميل</p>
                </div>
              </div>
              
              <div className="text-right">
                <div className="font-medium">{formatCurrencyTotals(segment.totalRevenue)}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SegmentAnalysis;
