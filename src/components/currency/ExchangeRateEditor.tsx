
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit, Save, X, RefreshCw } from 'lucide-react';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { CURRENCY_SYMBOLS } from '@/types/currency';
import { useToast } from '@/hooks/use-toast';

interface ExchangeRateEditorProps {
  pair: string;
  latest: any;
  onUpdate: () => void;
}

const ExchangeRateEditor = ({ pair, latest, onUpdate }: ExchangeRateEditorProps) => {
  const { updateExchangeRate } = useExchangeRates();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [newRate, setNewRate] = useState(latest.rate);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSave = async () => {
    try {
      setIsUpdating(true);
      await updateExchangeRate({
        id: latest.id,
        rate: parseFloat(newRate),
        effective_date: new Date().toISOString().split('T')[0]
      });
      setIsEditing(false);
      onUpdate();
      toast({
        title: "تم تحديث سعر الصرف",
        description: `تم تحديث سعر ${pair} بنجاح`,
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
        setNewRate(data.rates[latest.to_currency]);
        toast({
          title: "تم جلب السعر من الإنترنت",
          description: "تم تحديث السعر من مصدر خارجي",
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
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchGoogleRate}
                  disabled={isUpdating}
                >
                  <RefreshCw className={`h-3 w-3 ${isUpdating ? 'animate-spin' : ''}`} />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
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
          <div className="text-center pt-2 border-t">
            <p className="text-xs text-gray-500">
              آخر تحديث: {new Date(latest.effective_date).toLocaleDateString('ar-SA')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ExchangeRateEditor;
