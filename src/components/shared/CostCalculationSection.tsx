
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, DollarSign, TrendingUp } from 'lucide-react';
import { useEffect } from 'react';

interface CostCalculationSectionProps {
  dailyRate: number;
  supplierDailyCost: number;
  duration: number;
  additionalCosts?: {
    insurance?: number;
    fees?: number;
    taxes?: number;
  };
  onDailyRateChange: (rate: number) => void;
  onSupplierCostChange: (cost: number) => void;
  onAdditionalCostsChange?: (costs: any) => void;
  currency?: string;
  title?: string;
}

const CostCalculationSection = ({
  dailyRate,
  supplierDailyCost,
  duration,
  additionalCosts = {},
  onDailyRateChange,
  onSupplierCostChange,
  onAdditionalCostsChange,
  currency = 'EGP',
  title = "حساب التكاليف والأرباح"
}: CostCalculationSectionProps) => {
  const totalRevenue = dailyRate * duration;
  const totalSupplierCost = supplierDailyCost * duration;
  const totalAdditionalCosts = Object.values(additionalCosts).reduce((sum, cost) => sum + (cost || 0), 0);
  const totalCost = totalSupplierCost + totalAdditionalCosts;
  const totalProfit = totalRevenue - totalCost;
  const profitMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100) : 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Calculator className="h-5 w-5" />
        {title}
      </h3>
      
      {/* Input Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="daily_rate">السعر اليومي ({currency})</Label>
          <Input
            type="number"
            id="daily_rate"
            value={dailyRate}
            onChange={(e) => onDailyRateChange(Number(e.target.value))}
            min="0"
            step="0.01"
          />
        </div>
        
        <div>
          <Label htmlFor="supplier_daily_cost">تكلفة المورد اليومية ({currency})</Label>
          <Input
            type="number"
            id="supplier_daily_cost"
            value={supplierDailyCost}
            onChange={(e) => onSupplierCostChange(Number(e.target.value))}
            min="0"
            step="0.01"
          />
        </div>

        {onAdditionalCostsChange && (
          <>
            <div>
              <Label htmlFor="insurance_cost">تكلفة التأمين ({currency})</Label>
              <Input
                type="number"
                id="insurance_cost"
                value={additionalCosts.insurance || 0}
                onChange={(e) => onAdditionalCostsChange({
                  ...additionalCosts,
                  insurance: Number(e.target.value)
                })}
                min="0"
                step="0.01"
              />
            </div>
            
            <div>
              <Label htmlFor="additional_fees">رسوم إضافية ({currency})</Label>
              <Input
                type="number"
                id="additional_fees"
                value={additionalCosts.fees || 0}
                onChange={(e) => onAdditionalCostsChange({
                  ...additionalCosts,
                  fees: Number(e.target.value)
                })}
                min="0"
                step="0.01"
              />
            </div>
          </>
        )}
      </div>

      {/* Calculation Results */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              إجمالي الإيرادات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalRevenue.toLocaleString()} {currency}
            </div>
            <div className="text-xs text-gray-500">
              {dailyRate} × {duration} أيام
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-600" />
              إجمالي التكاليف
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {totalCost.toLocaleString()} {currency}
            </div>
            <div className="text-xs text-gray-500">
              مورد + رسوم إضافية
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              صافي الربح
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              {totalProfit.toLocaleString()} {currency}
            </div>
            <div className="text-xs text-gray-500">
              هامش ربح: {profitMargin.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CostCalculationSection;
