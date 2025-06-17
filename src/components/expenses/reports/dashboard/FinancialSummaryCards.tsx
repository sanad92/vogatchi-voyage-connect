
import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import EgyptianPoundDisplay from '@/components/currency/EgyptianPoundDisplay';

interface FinancialSummary {
  total_revenue_egp: number;
  total_expenses_egp: number;
  total_salaries_egp: number;
  total_rent_payments_egp: number;
  net_profit_egp: number;
  period_start: string;
  period_end: string;
}

interface FinancialSummaryCardsProps {
  summary: FinancialSummary;
}

const FinancialSummaryCards = ({ summary }: FinancialSummaryCardsProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-green-600">
                <EgyptianPoundDisplay amount={summary.total_revenue_egp} />
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">إجمالي المصروفات</p>
              <p className="text-2xl font-bold text-red-600">
                <EgyptianPoundDisplay amount={summary.total_expenses_egp} />
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">الرواتب المدفوعة</p>
              <p className="text-2xl font-bold text-blue-600">
                <EgyptianPoundDisplay amount={summary.total_salaries_egp} />
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">صافي الربح</p>
              <p className={`text-2xl font-bold ${
                summary.net_profit_egp >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <EgyptianPoundDisplay amount={summary.net_profit_egp} />
              </p>
            </div>
            {summary.net_profit_egp >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-600" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-600" />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialSummaryCards;
