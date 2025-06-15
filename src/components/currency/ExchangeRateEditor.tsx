import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useExchangeRates } from '@/hooks/useExchangeRates';
import { useToast } from '@/hooks/use-toast';
import RateDisplay from './exchange-rate-editor/RateDisplay';
import RateFreshnessIndicator from './exchange-rate-editor/RateFreshnessIndicator';
import RateActionButtons from './exchange-rate-editor/RateActionButtons';
import RateInfo from './exchange-rate-editor/RateInfo';

interface ExchangeRateEditorProps {
  pair: string;
  latest: any;
  onUpdate: () => void;
}

const ExchangeRateEditor = ({ pair, latest, onUpdate }: ExchangeRateEditorProps) => {
  const { updateExchangeRate, addExchangeRate } = useExchangeRates();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [newRate, setNewRate] = useState(latest.rate.toString());
  const [isUpdating, setIsUpdating] = useState(false);

  const isToday = new Date(latest.effective_date).toDateString() === new Date().toDateString();

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
    setNewRate(latest.rate.toString());
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
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

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {latest.from_currency}/{latest.to_currency}
          </CardTitle>
          <RateActionButtons
            isEditing={isEditing}
            isUpdating={isUpdating}
            newRate={newRate}
            onEdit={handleEdit}
            onSave={handleManualSave}
            onCancel={handleCancel}
            onGoogleUpdate={fetchGoogleRate}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <RateDisplay
            latest={latest}
            isEditing={isEditing}
            newRate={newRate}
            onRateChange={setNewRate}
            isUpdating={isUpdating}
          />
          
          <div className="flex items-center justify-center gap-2">
            <RateFreshnessIndicator effectiveDate={latest.effective_date} />
          </div>

          <RateInfo effectiveDate={latest.effective_date} isEditing={isEditing} />
        </div>
      </CardContent>
    </Card>
  );
};

export default ExchangeRateEditor;
