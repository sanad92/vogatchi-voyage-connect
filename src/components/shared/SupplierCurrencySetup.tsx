
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Star } from 'lucide-react';
import CurrencySelector from '@/components/currency/CurrencySelector';
import { SupportedCurrency, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/types/currency';

export interface SupplierCurrencySetupData {
  currency: SupportedCurrency;
  is_primary: boolean;
  exchange_rate?: number;
  notes?: string;
}

interface SupplierCurrencySetupProps {
  currencies: SupplierCurrencySetupData[];
  onCurrenciesChange: (currencies: SupplierCurrencySetupData[]) => void;
}

const SupplierCurrencySetup = ({ currencies, onCurrenciesChange }: SupplierCurrencySetupProps) => {
  const [newCurrency, setNewCurrency] = useState<SupplierCurrencySetupData>({
    currency: 'EGP',
    is_primary: currencies.length === 0,
    exchange_rate: undefined,
    notes: ''
  });

  const addCurrency = () => {
    // التحقق من عدم وجود العملة مسبقاً
    if (currencies.find(c => c.currency === newCurrency.currency)) {
      alert('هذه العملة مضافة بالفعل');
      return;
    }

    // إذا كانت العملة الجديدة أساسية، إلغاء تعيين العملات الأساسية الأخرى
    let updatedCurrencies = currencies.map(c => ({
      ...c,
      is_primary: newCurrency.is_primary ? false : c.is_primary
    }));

    updatedCurrencies.push(newCurrency);
    onCurrenciesChange(updatedCurrencies);

    // إعادة تعيين النموذج
    setNewCurrency({
      currency: 'EGP',
      is_primary: false,
      exchange_rate: undefined,
      notes: ''
    });
  };

  const removeCurrency = (index: number) => {
    const updatedCurrencies = currencies.filter((_, i) => i !== index);
    onCurrenciesChange(updatedCurrencies);
  };

  const setPrimary = (index: number) => {
    const updatedCurrencies = currencies.map((c, i) => ({
      ...c,
      is_primary: i === index
    }));
    onCurrenciesChange(updatedCurrencies);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">العملات المدعومة</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* العملات المضافة */}
        {currencies.length > 0 && (
          <div className="space-y-2">
            {currencies.map((currency, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  <Badge variant={currency.is_primary ? "default" : "secondary"}>
                    {CURRENCY_NAMES[currency.currency]} ({CURRENCY_SYMBOLS[currency.currency]})
                  </Badge>
                  {currency.is_primary && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  )}
                  {currency.exchange_rate && (
                    <span className="text-sm text-gray-600">
                      {currency.exchange_rate}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!currency.is_primary && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPrimary(index)}
                    >
                      جعل أساسية
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeCurrency(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* إضافة عملة جديدة */}
        <div className="border-t pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>العملة</Label>
              <CurrencySelector
                value={newCurrency.currency}
                onValueChange={(value) => setNewCurrency({...newCurrency, currency: value})}
              />
            </div>
            <div>
              <Label>سعر الصرف (اختياري)</Label>
              <Input
                type="number"
                step="0.0001"
                placeholder="1.0000"
                value={newCurrency.exchange_rate || ''}
                onChange={(e) => setNewCurrency({
                  ...newCurrency, 
                  exchange_rate: e.target.value ? parseFloat(e.target.value) : undefined
                })}
              />
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={newCurrency.is_primary}
                onCheckedChange={(checked) => setNewCurrency({...newCurrency, is_primary: checked})}
              />
              <Label>عملة أساسية</Label>
            </div>
            <Button onClick={addCurrency}>
              <Plus className="w-4 h-4 ml-2" />
              إضافة العملة
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SupplierCurrencySetup;
