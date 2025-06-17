
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

interface SalariesTabProps {
  salariesSummary: number;
}

const SalariesTab = ({ salariesSummary }: SalariesTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ملخص الرواتب المدفوعة</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-8">
          <DollarSign className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <p className="text-3xl font-bold text-blue-600">
            <EgyptianPoundDisplay amount={salariesSummary || 0} />
          </p>
          <p className="text-gray-500 mt-2">إجمالي الرواتب المدفوعة في الفترة المحددة</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SalariesTab;
