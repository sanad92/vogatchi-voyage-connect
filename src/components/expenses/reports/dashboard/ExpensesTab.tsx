
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';
import { useExpenseBreakdown } from '@/hooks/useExpenseBreakdown';

interface ExpensesTabProps {
  startDate: string;
  endDate: string;
}

const ExpensesTab = ({ startDate, endDate }: ExpensesTabProps) => {
  const { expenseBreakdown, isLoading } = useExpenseBreakdown(startDate, endDate);

  if (isLoading) {
    return <div className="text-center py-8">جاري التحميل...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>تفاصيل المصروفات حسب الفئة</CardTitle>
      </CardHeader>
      <CardContent>
        {!expenseBreakdown || expenseBreakdown.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">لا توجد مصروفات في الفترة المحددة</p>
          </div>
        ) : (
          <div className="space-y-4">
            {expenseBreakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">{item.category_name_ar}</h3>
                  <p className="text-sm text-gray-500">{item.transaction_count} معاملة</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-red-600">
                    <EgyptianPoundDisplay amount={item.total_amount_egp} />
                  </p>
                  {item.currency !== 'EGP' && (
                    <p className="text-xs text-gray-500">
                      {item.total_amount.toLocaleString()} {item.currency}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpensesTab;
