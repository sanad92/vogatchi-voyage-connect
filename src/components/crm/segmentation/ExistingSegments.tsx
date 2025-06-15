
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ExistingSegmentsProps {
  customerSegments: any[] | undefined;
  customers: any[] | undefined;
}

const ExistingSegments = ({ customerSegments, customers }: ExistingSegmentsProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {customerSegments?.map((segment) => (
        <Card key={segment.id}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <CardTitle className="text-lg">{segment.name_ar}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">الحد الأدنى للحجوزات</span>
                <span className="font-medium">{segment.minimum_bookings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">الحد الأدنى للإنفاق</span>
                <span className="font-medium">{formatCurrency(segment.minimum_total_spent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">عدد العملاء</span>
                <span className="font-medium">
                  {customers?.filter(c => c.segment_id === segment.id).length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ExistingSegments;
