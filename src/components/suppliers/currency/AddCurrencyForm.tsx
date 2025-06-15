
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import CurrencySelector from '@/components/currency/CurrencySelector';
import { SupportedCurrency } from '@/types/currency';

interface AddCurrencyFormData {
  currency: SupportedCurrency;
  is_primary: boolean;
  exchange_rate?: number;
  notes?: string;
}

interface AddCurrencyFormProps {
  isVisible: boolean;
  isLoading: boolean;
  onSubmit: (data: AddCurrencyFormData) => void;
  onCancel: () => void;
  existingCurrencies: string[];
}

const AddCurrencyForm = ({ 
  isVisible, 
  isLoading, 
  onSubmit, 
  onCancel, 
  existingCurrencies 
}: AddCurrencyFormProps) => {
  const [formData, setFormData] = useState<AddCurrencyFormData>({
    currency: 'EGP',
    is_primary: false,
    exchange_rate: undefined,
    notes: ''
  });

  const handleSubmit = () => {
    if (existingCurrencies.includes(formData.currency)) {
      alert('هذه العملة مضافة بالفعل للمورد');
      return;
    }

    onSubmit(formData);
    
    // Reset form
    setFormData({
      currency: 'EGP',
      is_primary: false,
      exchange_rate: undefined,
      notes: ''
    });
  };

  if (!isVisible) return null;

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>العملة</Label>
            <CurrencySelector
              value={formData.currency}
              onValueChange={(value) => setFormData({...formData, currency: value})}
            />
          </div>
          <div>
            <Label>سعر الصرف (اختياري)</Label>
            <Input
              type="number"
              step="0.0001"
              placeholder="1.0000"
              value={formData.exchange_rate || ''}
              onChange={(e) => setFormData({
                ...formData, 
                exchange_rate: e.target.value ? parseFloat(e.target.value) : undefined
              })}
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_primary"
                checked={formData.is_primary}
                onCheckedChange={(checked) => setFormData({...formData, is_primary: checked})}
              />
              <Label htmlFor="is_primary">عملة أساسية</Label>
            </div>
          </div>
          <div className="md:col-span-2">
            <Label>ملاحظات</Label>
            <Textarea
              placeholder="ملاحظات إضافية..."
              value={formData.notes || ''}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              rows={2}
            />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button 
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? "جاري الإضافة..." : "إضافة العملة"}
            </Button>
            <Button 
              variant="outline" 
              onClick={onCancel}
            >
              إلغاء
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddCurrencyForm;
