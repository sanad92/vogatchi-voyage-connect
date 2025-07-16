import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, Calendar, Banknote } from 'lucide-react';

interface PriceCalculationDisplayProps {
  calculations: any;
  type: 'hotel' | 'flight' | 'invoice';
  currency?: string;
}

const PriceCalculationDisplay = ({ calculations, type, currency = 'EGP' }: PriceCalculationDisplayProps) => {
  if (!calculations || Object.keys(calculations).length === 0) {
    return null;
  }

  const getCurrencySymbol = (curr: string) => {
    const symbols: Record<string, string> = {
      'EGP': 'ج.م',
      'USD': '$',
      'EUR': '€',
      'SAR': 'ر.س',
      'AED': 'د.إ'
    };
    return symbols[curr] || curr;
  };

  const formatAmount = (amount: number) => {
    return `${amount.toLocaleString('ar-EG')} ${getCurrencySymbol(currency)}`;
  };

  const getProfitColor = (profit: number) => {
    if (profit > 0) return 'text-green-600';
    if (profit < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getProfitMarginBadge = (margin: number) => {
    if (margin >= 20) return 'bg-green-100 text-green-800';
    if (margin >= 10) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-blue-800">الحسابات التلقائية</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* المبلغ الإجمالي */}
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Banknote className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-gray-600">المبلغ الإجمالي</span>
            </div>
            <div className="text-lg font-bold text-blue-700">
              {formatAmount(calculations.totalCost || calculations.finalAmount || 0)}
            </div>
          </div>

          {/* الربح */}
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm text-gray-600">الربح</span>
            </div>
            <div className={`text-lg font-bold ${getProfitColor(calculations.totalProfit || 0)}`}>
              {formatAmount(calculations.totalProfit || 0)}
            </div>
          </div>

          {/* نسبة الربح */}
          <div className="text-center p-3 bg-white rounded-lg shadow-sm">
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-sm text-gray-600">نسبة الربح</span>
            </div>
            <Badge className={getProfitMarginBadge(calculations.profitMargin || 0)}>
              {(calculations.profitMargin || 0).toFixed(1)}%
            </Badge>
          </div>

          {/* معلومات إضافية حسب النوع */}
          {type === 'hotel' && calculations.numberOfNights && (
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className="h-4 w-4 text-purple-600" />
                <span className="text-sm text-gray-600">عدد الليالي</span>
              </div>
              <div className="text-lg font-bold text-purple-700">
                {calculations.numberOfNights}
              </div>
            </div>
          )}

          {type === 'flight' && calculations.numberOfPassengers && (
            <div className="text-center p-3 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-sm text-gray-600">عدد المسافرين</span>
              </div>
              <div className="text-lg font-bold text-purple-700">
                {calculations.numberOfPassengers}
              </div>
            </div>
          )}
        </div>

        {/* معلومات الدفع */}
        {calculations.remainingAmount !== undefined && (
          <div className="mt-4 p-3 bg-white rounded-lg border-l-4 border-orange-400">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">المبلغ المتبقي:</span>
              <span className="font-bold text-orange-600">
                {formatAmount(calculations.remainingAmount)}
              </span>
            </div>
            {calculations.paymentPercentage !== undefined && (
              <div className="mt-1 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, calculations.paymentPercentage)}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {/* تفاصيل الضرائب إذا وُجدت */}
        {calculations.taxAmount > 0 && (
          <div className="mt-3 p-2 bg-yellow-50 rounded border-l-4 border-yellow-400">
            <div className="flex justify-between text-sm">
              <span>الضرائب:</span>
              <span className="font-medium">{formatAmount(calculations.taxAmount)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold">
              <span>المجموع شامل الضرائب:</span>
              <span>{formatAmount(calculations.totalWithTax)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PriceCalculationDisplay;