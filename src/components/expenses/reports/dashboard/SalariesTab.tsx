import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';
import { CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/types/currency';

interface SalariesTabProps {
  salariesByCurrency: Record<string, number>;
}

const SalariesTab = ({ salariesByCurrency }: SalariesTabProps) => {
  const entries = Object.entries(salariesByCurrency || {});
  return (
    <Card>
      <CardHeader><CardTitle>ملخص الرواتب المدفوعة</CardTitle></CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">لا توجد رواتب مدفوعة</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {entries.map(([cur, amount]) => (
              <div key={cur} className="text-center py-6 border rounded-lg">
                <DollarSign className="h-12 w-12 text-blue-600 mx-auto mb-3" />
                <p className="text-2xl font-bold text-blue-600">
                  {amount.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} {CURRENCY_SYMBOLS[cur as keyof typeof CURRENCY_SYMBOLS] || cur}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{CURRENCY_NAMES[cur as keyof typeof CURRENCY_NAMES] || cur}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SalariesTab;
