
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface SegmentAnalysisProps {
  customerSegments: any[] | undefined;
  customers: any[] | undefined;
}

const SegmentAnalysis = ({ customerSegments, customers }: SegmentAnalysisProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // تحليل توزيع العملاء حسب القطاعات
  const segmentAnalysis = customerSegments?.map(segment => {
    const segmentCustomers = customers?.filter(c => c.segment_id === segment.id) || [];
    return {
      ...segment,
      customerCount: segmentCustomers.length,
      totalRevenue: segmentCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0),
      avgOrderValue: segmentCustomers.length > 0 ? 
        segmentCustomers.reduce((sum, c) => sum + (c.total_spent || 0), 0) / segmentCustomers.length : 0
    };
  }) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>تحليل القطاعات</CardTitle>
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
                <div className="font-medium">{formatCurrency(segment.totalRevenue)}</div>
                <div className="text-sm text-gray-600">
                  متوسط: {formatCurrency(segment.avgOrderValue)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default SegmentAnalysis;
