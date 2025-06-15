
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import ExchangeRateStats from './ExchangeRateStats';
import AddExchangeRateForm from './AddExchangeRateForm';
import ExchangeRateGrid from './ExchangeRateGrid';
import ExchangeRateEmptyState from './ExchangeRateEmptyState';
import GoogleExchangeRateSync from './GoogleExchangeRateSync';
import ExchangeRateChart from './exchange-rate-analytics/ExchangeRateChart';
import RateAlerts from './exchange-rate-analytics/RateAlerts';
import AdvancedStats from './exchange-rate-analytics/AdvancedStats';
import DataExporter from './exchange-rate-analytics/DataExporter';
import RateComparison from './exchange-rate-analytics/RateComparison';

const ExchangeRateManager = () => {
  const { exchangeRates, isLoading, addExchangeRate } = useExchangeRates();
  const [showAddRate, setShowAddRate] = useState(false);

  const handleAddRate = (newRate: any) => {
    addExchangeRate(newRate);
    setShowAddRate(false);
  };

  // تجميع أسعار الصرف حسب زوج العملات
  const groupedRates = exchangeRates.reduce((acc, rate) => {
    const pair = `${rate.from_currency}-${rate.to_currency}`;
    if (!acc[pair]) {
      acc[pair] = [];
    }
    acc[pair].push(rate);
    return acc;
  }, {} as Record<string, typeof exchangeRates>);

  // الحصول على أحدث سعر صرف لكل زوج
  const latestRates = Object.entries(groupedRates).map(([pair, rates]) => {
    const latest = rates.sort((a, b) => new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime())[0];
    const previous = rates[1];
    return {
      pair,
      latest,
      previous,
      trend: (previous ? (latest.rate > previous.rate ? 'up' : 'down') : 'neutral') as 'up' | 'down' | 'neutral'
    };
  });

  // الحصول على البيانات التاريخية لأول زوج عملات للرسم البياني
  const getChartData = (pair: string) => {
    const rates = groupedRates[pair] || [];
    return rates
      .sort((a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime())
      .slice(-10) // آخر 10 نقاط
      .map(rate => ({
        date: rate.effective_date,
        rate: rate.rate,
        from_currency: rate.from_currency,
        to_currency: rate.to_currency
      }));
  };

  if (isLoading) return <div className="text-center p-8">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <ExchangeRateStats latestRates={latestRates} />

      {/* التنبيهات والتحليلات السريعة */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RateAlerts latestRates={latestRates} />
        <RateComparison latestRates={latestRates} />
      </div>

      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="manage">إدارة الأسعار</TabsTrigger>
          <TabsTrigger value="sync">المزامنة التلقائية</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
          <TabsTrigger value="export">التصدير</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
          <AddExchangeRateForm
            onAddRate={handleAddRate}
            showForm={showAddRate}
            onToggleForm={() => setShowAddRate(!showAddRate)}
          />

          {latestRates.length > 0 ? (
            <ExchangeRateGrid
              latestRates={latestRates}
              onUpdate={() => window.location.reload()}
            />
          ) : (
            <ExchangeRateEmptyState onShowAddForm={() => setShowAddRate(true)} />
          )}
        </TabsContent>

        <TabsContent value="sync">
          <GoogleExchangeRateSync />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <AdvancedStats 
            latestRates={latestRates} 
            exchangeRates={exchangeRates}
          />
          
          {latestRates.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {latestRates.slice(0, 2).map(({ pair }) => (
                <ExchangeRateChart
                  key={pair}
                  data={getChartData(pair)}
                  pair={pair}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="export">
          <DataExporter 
            exchangeRates={exchangeRates}
            latestRates={latestRates}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExchangeRateManager;
