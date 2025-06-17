
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FinancialSummary {
  total_revenue_egp: number;
  total_expenses_egp: number;
  total_salaries_egp: number;
  total_rent_payments_egp: number;
  net_profit_egp: number;
  period_start: string;
  period_end: string;
}

interface AnalysisTabProps {
  summary: FinancialSummary;
}

const AnalysisTab = ({ summary }: AnalysisTabProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>التحليل المالي</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-lg">نسب الإنفاق</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>المصروفات التشغيلية</span>
                  <span>
                    {summary.total_revenue_egp > 0 
                      ? ((summary.total_expenses_egp / summary.total_revenue_egp) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>الرواتب</span>
                  <span>
                    {summary.total_revenue_egp > 0 
                      ? ((summary.total_salaries_egp / summary.total_revenue_egp) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>مدفوعات الإيجار</span>
                  <span>
                    {summary.total_revenue_egp > 0 
                      ? ((summary.total_rent_payments_egp / summary.total_revenue_egp) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-lg">هامش الربح</h3>
              <div className="text-center">
                <p className={`text-4xl font-bold ${
                  summary.net_profit_egp >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {summary.total_revenue_egp > 0 
                    ? ((summary.net_profit_egp / summary.total_revenue_egp) * 100).toFixed(1)
                    : 0}%
                </p>
                <p className="text-gray-500">هامش الربح الصافي</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AnalysisTab;
