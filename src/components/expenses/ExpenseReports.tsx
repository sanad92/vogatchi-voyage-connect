
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

const ExpenseReports = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            تقارير المصروفات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingUp className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">قيد التطوير</h3>
            <p className="text-gray-600">
              سيتم إضافة تقارير المصروفات قريباً
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ExpenseReports;
