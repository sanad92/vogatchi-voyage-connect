
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, AlertCircle, Calendar } from 'lucide-react';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { SUPPORTED_CURRENCIES } from '@/types/currency';
import { useToast } from '@/hooks/use-toast';

const GoogleExchangeRateSync = () => {
  const { addExchangeRate, exchangeRates } = useExchangeRates();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncedRates, setSyncedRates] = useState<any[]>([]);

  const syncAllRates = async () => {
    try {
      setIsSyncing(true);
      const newRates: any[] = [];
      const today = new Date().toISOString().split('T')[0];

      // جلب أسعار الصرف لجميع العملات المدعومة
      for (const fromCurrency of SUPPORTED_CURRENCIES) {
        try {
          const response = await fetch(
            `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
          );
          const data = await response.json();

          for (const toCurrency of SUPPORTED_CURRENCIES) {
            if (fromCurrency !== toCurrency && data.rates[toCurrency]) {
              // التحقق من وجود سعر لليوم الحالي
              const existingTodayRate = exchangeRates.find(rate => 
                rate.from_currency === fromCurrency && 
                rate.to_currency === toCurrency && 
                rate.effective_date === today
              );

              // إذا لم يكن هناك سعر لليوم، أضف سعر جديد
              if (!existingTodayRate) {
                const rate = {
                  from_currency: fromCurrency,
                  to_currency: toCurrency,
                  rate: data.rates[toCurrency],
                  effective_date: today,
                  is_active: true
                };
                
                newRates.push(rate);
                await addExchangeRate(rate);
              }
            }
          }
        } catch (error) {
          console.error(`Error fetching rates for ${fromCurrency}:`, error);
        }
      }

      setSyncedRates(newRates);
      setLastSync(new Date());
      
      toast({
        title: "تم تحديث أسعار الصرف",
        description: `تم إضافة ${newRates.length} سعر صرف جديد لليوم`,
      });
    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: "فشل في جلب أسعار الصرف من Google",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const getTodayRatesCount = () => {
    const today = new Date().toISOString().split('T')[0];
    return exchangeRates.filter(rate => rate.effective_date === today).length;
  };

  const todayRatesCount = getTodayRatesCount();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            مزامنة أسعار الصرف من Google
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant={lastSync ? "default" : "secondary"}>
              {lastSync ? "تم التحديث" : "لم يتم التحديث"}
            </Badge>
            {todayRatesCount > 0 && (
              <Badge variant="outline" className="bg-green-50">
                <Calendar className="h-3 w-3 mr-1" />
                {todayRatesCount} سعر لليوم
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <Button 
            onClick={syncAllRates} 
            disabled={isSyncing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'جاري التحديث...' : 'تحديث أسعار اليوم'}
          </Button>
          
          {lastSync && (
            <div className="text-sm text-gray-600">
              آخر تحديث: {lastSync.toLocaleString('ar-SA')}
            </div>
          )}
        </div>

        {syncedRates.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">الأسعار المحدثة:</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {syncedRates.slice(0, 6).map((rate, index) => (
                <div key={index} className="text-xs p-2 bg-gray-50 rounded">
                  {rate.from_currency}/{rate.to_currency}: {rate.rate.toFixed(4)}
                </div>
              ))}
              {syncedRates.length > 6 && (
                <div className="text-xs p-2 bg-gray-50 rounded text-center">
                  +{syncedRates.length - 6} أكثر
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
          <div className="text-xs text-blue-800">
            <p className="font-medium">كيف يعمل التحديث:</p>
            <p>• ينشئ أسعار جديدة لليوم الحالي فقط</p>
            <p>• لا يحذف أو يعدل الأسعار السابقة</p>
            <p>• يتجاهل الأزواج التي لها أسعار لليوم بالفعل</p>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div className="text-xs text-yellow-800">
            <p className="font-medium">ملاحظة مهمة:</p>
            <p>يتم جلب أسعار الصرف من مصدر خارجي وقد تختلف عن الأسعار الرسمية. يرجى التحقق من دقة الأسعار قبل الاستخدام.</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default GoogleExchangeRateSync;
