
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';
import { useRevenueBreakdown } from '@/hooks/useRevenueBreakdown';

interface RevenueTabProps {
  startDate: string;
  endDate: string;
}

const RevenueTab = ({ startDate, endDate }: RevenueTabProps) => {
  const { revenueBreakdown, isLoading } = useRevenueBreakdown(startDate, endDate);

  if (isLoading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>تفاصيل الإيرادات حسب نوع الحجز</CardTitle>
      </CardHeader>
      <CardContent>
        {!revenueBreakdown || revenueBreakdown.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">لا توجد إيرادات في الفترة المحددة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {revenueBreakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">{item.booking_type}</h3>
                  <p className="text-sm text-gray-500">{item.booking_count} حجز</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    {item.total_revenue.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} {item.currency}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RevenueTab;
