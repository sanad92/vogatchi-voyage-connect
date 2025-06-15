
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, TrendingUp, TrendingDown, Plus } from 'lucide-react';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { SUPPORTED_CURRENCIES, CURRENCY_SYMBOLS } from '@/types/currency';
import { useToast } from '@/hooks/use-toast';
import ExchangeRateEditor from './ExchangeRateEditor';
import GoogleExchangeRateSync from './GoogleExchangeRateSync';

const ExchangeRateManager = () => {
  const { exchangeRates, isLoading, addExchangeRate } = useExchangeRates();
  const { toast } = useToast();
  const [showAddRate, setShowAddRate] = useState(false);
  const [newRate, setNewRate] = useState({
    from_currency: '',
    to_currency: '',
    rate: 0,
    effective_date: new Date().toISOString().split('T')[0]
  });

  const handleAddRate = async () => {
    if (!newRate.from_currency || !newRate.to_currency || !newRate.rate) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى ملء جميع الحقول المطلوبة",
        variant: "destructive",
      });
      return;
    }

    if (newRate.from_currency === newRate.to_currency) {
      toast({
        title: "خطأ في البيانات",
        description: "لا يمكن أن تكون العملة المصدر والوجهة متشابهة",
        variant: "destructive",
      });
      return;
    }

    addExchangeRate({
      ...newRate,
      is_active: true
    });

    setNewRate({
      from_currency: '',
      to_currency: '',
      rate: 0,
      effective_date: new Date().toISOString().split('T')[0]
    });
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
      trend: previous ? (latest.rate > previous.rate ? 'up' : 'down') : 'neutral'
    };
  });

  if (isLoading) return <div className="text-center p-8">جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      {/* ملخص أسعار الصرف */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">أزواج العملات</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{latestRates.length}</div>
            <p className="text-xs text-muted-foreground">زوج عملات متاح</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">آخر تحديث</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {latestRates.length > 0 ? 
                new Date(Math.max(...latestRates.map(r => new Date(r.latest.effective_date).getTime()))).toLocaleDateString('ar-SA') :
                'لا يوجد'
              }
            </div>
            <p className="text-xs text-muted-foreground">تاريخ آخر تحديث</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الاتجاه العام</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {latestRates.filter(r => r.trend === 'up').length} صاعد
            </div>
            <p className="text-xs text-muted-foreground">
              {latestRates.filter(r => r.trend === 'down').length} هابط
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="manage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manage">إدارة الأسعار</TabsTrigger>
          <TabsTrigger value="sync">المزامنة التلقائية</TabsTrigger>
        </TabsList>

        <TabsContent value="manage" className="space-y-6">
          {/* إضافة سعر صرف جديد */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>إدارة أسعار الصرف يدوياً</CardTitle>
                <Button onClick={() => setShowAddRate(!showAddRate)}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة سعر صرف
                </Button>
              </div>
            </CardHeader>
            {showAddRate && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">من العملة</label>
                    <Select value={newRate.from_currency} onValueChange={(value) => setNewRate({...newRate, from_currency: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العملة" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map(currency => (
                          <SelectItem key={currency} value={currency}>
                            {currency} - {CURRENCY_SYMBOLS[currency]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">إلى العملة</label>
                    <Select value={newRate.to_currency} onValueChange={(value) => setNewRate({...newRate, to_currency: value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر العملة" />
                      </SelectTrigger>
                      <SelectContent>
                        {SUPPORTED_CURRENCIES.map(currency => (
                          <SelectItem key={currency} value={currency}>
                            {currency} - {CURRENCY_SYMBOLS[currency]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">السعر</label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={newRate.rate}
                      onChange={(e) => setNewRate({...newRate, rate: parseFloat(e.target.value) || 0})}
                      placeholder="0.000000"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">تاريخ السريان</label>
                    <Input
                      type="date"
                      value={newRate.effective_date}
                      onChange={(e) => setNewRate({...newRate, effective_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddRate}>إضافة السعر</Button>
                  <Button variant="outline" onClick={() => setShowAddRate(false)}>إلغاء</Button>
                </div>
              </CardContent>
            )}
          </Card>

          {/* عرض أسعار الصرف للتعديل */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestRates.map(({ pair, latest, trend }) => (
              <ExchangeRateEditor
                key={pair}
                pair={pair}
                latest={latest}
                onUpdate={() => window.location.reload()} // إعادة تحميل البيانات
              />
            ))}
          </div>

          {latestRates.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <RefreshCw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">لا توجد أسعار صرف</h3>
                <p className="text-gray-500 mb-4">ابدأ بإضافة أسعار الصرف للعملات المختلفة</p>
                <Button onClick={() => setShowAddRate(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  إضافة سعر صرف
                </Button>
              </CardContent>
            </Card>
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
