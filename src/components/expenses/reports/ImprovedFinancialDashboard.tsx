import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, AlertCircle, Loader2 } from 'lucide-react';
import { useFinancialSummary } from '@/hooks/useFinancialSummary';
import { useFinancialReportsImproved } from '@/hooks/useFinancialReportsImproved';
import FinancialSummaryCards from './dashboard/FinancialSummaryCards';
import DateRangeFilter from './dashboard/DateRangeFilter';
import RevenueTab from './dashboard/RevenueTab';
import ExpensesTab from './dashboard/ExpensesTab';
import SalariesTab from './dashboard/SalariesTab';
import AnalysisTab from './dashboard/AnalysisTab';

interface DateRange {
  start: string;
  end: string;
}

const ImprovedFinancialDashboard = () => {
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { summaryByCurrency, isLoading } = useFinancialSummary(dateRange.start, dateRange.end);
  const { salariesByCurrency } = useFinancialReportsImproved(dateRange.start, dateRange.end);

  const handleDateRangeChange = (field: keyof DateRange, value: string) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>جاري تحميل التقارير المالية...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          لوحة التحكم المالية - كل عملة لها تقاريرها الخاصة بدون أي تحويل.
        </AlertDescription>
      </Alert>

      <DateRangeFilter dateRange={dateRange} onDateRangeChange={handleDateRangeChange} />

      <FinancialSummaryCards summaryByCurrency={summaryByCurrency} />

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="revenue" className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />الإيرادات</TabsTrigger>
          <TabsTrigger value="expenses" className="flex items-center gap-2"><TrendingDown className="h-4 w-4" />المصروفات</TabsTrigger>
          <TabsTrigger value="salaries" className="flex items-center gap-2"><DollarSign className="h-4 w-4" />الرواتب</TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />التحليل</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <RevenueTab startDate={dateRange.start} endDate={dateRange.end} />
        </TabsContent>
        <TabsContent value="expenses" className="space-y-4">
          <ExpensesTab startDate={dateRange.start} endDate={dateRange.end} />
        </TabsContent>
        <TabsContent value="salaries" className="space-y-4">
          <SalariesTab salariesByCurrency={salariesByCurrency || {}} />
        </TabsContent>
        <TabsContent value="analysis" className="space-y-4">
          <AnalysisTab summaryByCurrency={summaryByCurrency} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ImprovedFinancialDashboard;
