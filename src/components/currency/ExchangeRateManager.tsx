
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import ExchangeRateStats from './ExchangeRateStats';
import AddExchangeRateForm from './AddExchangeRateForm';
import ExchangeRateGrid from './ExchangeRateGrid';
import ExchangeRateEmptyState from './ExchangeRateEmptyState';
import GoogleExchangeRateSync from './GoogleExchangeRateSync';

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
      trend: previous ? (latest.rate > previous.rate ? 'up' : 'down') : 'neutral' as const
    };
  });

  if (isLoading) return <div className="text-center p-8">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <ExchangeRateStats latestRates={latestRates} />

      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manage">إدارة الأسعار</TabsTrigger>
          <TabsTrigger value="sync">المزامنة التلقائية</TabsTrigger>
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
      </Tabs>
    </div>
  );
};

export default ExchangeRateManager;
