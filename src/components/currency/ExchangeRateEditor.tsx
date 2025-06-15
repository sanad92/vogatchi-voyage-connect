import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X, RefreshCw, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { CURRENCY_SYMBOLS } from '@/types/currency';
import { useToast } from '@/hooks/use-toast';

interface ExchangeRateEditorProps {
  pair: string;
  latest: any;
  onUpdate: () => void;
}

const ExchangeRateEditor = ({ pair, latest, onUpdate }: ExchangeRateEditorProps) => {
  const { updateExchangeRate, addExchangeRate } = useExchangeRates();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [newRate, setNewRate] = useState(latest.rate);
  const [isUpdating, setIsUpdating] = useState(false);

  const isToday = new Date(latest.effective_date).toDateString() === new Date().toDateString();
  const daysSinceUpdate = Math.floor((new Date().getTime() - new Date(latest.effective_date).getTime()) / (1000 * 60 * 60 * 24));

  const handleManualSave = async () => {
    try {
      setIsUpdating(true);
      // For manual updates, keep the same effective_date
      await updateExchangeRate({
        id: latest.id,
        rate: parseFloat(newRate)
      });
      setIsEditing(false);
      onUpdate();
      toast({
        title: "تم تحديث سعر الصرف",
        description: `تم تحديث سعر ${pair} يدوياً`,
      });
    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: "فشل في تحديث سعر الصرف",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancel = () => {
    setNewRate(latest.rate);
    setIsEditing(false);
  };

  const fetchGoogleRate = async () => {
    try {
      setIsUpdating(true);
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${latest.from_currency}`
      );
      const data = await response.json();
      
      if (data.rates && data.rates[latest.to_currency]) {
        // For Google rates, create a new entry with today's date if it's not today
        if (!isToday) {
          await addExchangeRate({
            from_currency: latest.from_currency,
            to_currency: latest.to_currency,
            rate: data.rates[latest.to_currency],
            effective_date: new Date().toISOString().split('T')[0],
            is_active: true
          });
        } else {
          // If it's today, just update the rate
          await updateExchangeRate({
            id: latest.id,
            rate: data.rates[latest.to_currency]
          });
        }
        onUpdate();
        toast({
          title: "تم تحديث السعر من الإنترنت",
          description: isToday ? "تم تحديث سعر اليوم" : "تم إضافة سعر جديد لليوم",
        });
      } else {
        throw new Error('Rate not found');
      }
    } catch (error) {
      toast({
        title: "خطأ في جلب السعر",
        description: "فشل في الحصول على سعر الصرف من الإنترنت",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getRateFreshnessColor = () => {
    if (isToday) return "bg-green-100 text-green-800";
    if (daysSinceUpdate <= 1) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getRateFreshnessText = () => {
    if (isToday) return "محدث اليوم";
    if (daysSinceUpdate === 1) return "أمس";
    return `منذ ${daysSinceUpdate} أيام`;
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {latest.from_currency}/{latest.to_currency}
          </CardTitle>
          <div className="flex gap-2">
            {!isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  disabled={isUpdating}
                  title="تحرير يدوي - يحدث السعر بنفس التاريخ"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchGoogleRate}
                  disabled={isUpdating}
                  title="جلب من الإنترنت - ينشئ سعر جديد لليوم إذا لزم الأمر"
                >
                  <RefreshCw className={`h-3 w-3 ${isUpdating ? 'animate-spin' : ''}`} />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleManualSave}
                  disabled={isUpdating || !newRate}
                >
                  <Save className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isUpdating}
                >
                  <X className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-center">
            {isEditing ? (
              <Input
                type="number"
                step="0.000001"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="text-center text-xl font-bold"
                disabled={isUpdating}
              />
            ) : (
              <div className="text-2xl font-bold text-blue-600">
                {latest.rate.toFixed(6)}
              </div>
            )}
            <p className="text-sm text-gray-500 mt-1">
              1 {CURRENCY_SYMBOLS[latest.from_currency as keyof typeof CURRENCY_SYMBOLS]} = {latest.rate.toFixed(6)} {CURRENCY_SYMBOLS[latest.to_currency as keyof typeof CURRENCY_SYMBOLS]}
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <Badge className={getRateFreshnessColor()}>
              <Clock className="h-3 w-3 mr-1" />
              {getRateFreshnessText()}
            </Badge>
          </div>

          <div className="text-center pt-2 border-t">
            <p className="text-xs text-gray-500">
              تاريخ السعر: {new Date(latest.effective_date).toLocaleDateString('ar-SA')}
            </p>
            {isEditing && (
              <p className="text-xs text-blue-600 mt-1">
                💡 التحرير اليدوي يحدث السعر بنفس التاريخ
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExchangeRateEditor;
