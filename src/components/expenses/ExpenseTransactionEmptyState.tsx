
import { Card, CardContent } from '@/components/ui/card';
import { Receipt } from 'lucide-react';

const ExpenseTransactionEmptyState = () => {
  return (
    <Card>
      <CardContent className="text-center py-8">
        <Receipt className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium mb-2">لا توجد مصروفات</h3>
        <p className="text-gray-600 mb-4">
          لم يتم العثور على مصروفات مطابقة لمعايير البحث
        </p>
      </CardContent>
    </Card>
  );
};

export default ExpenseTransactionEmptyState;
