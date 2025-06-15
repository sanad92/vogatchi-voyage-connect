
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Star, DollarSign } from 'lucide-react';
import { useSupplierCurrencies } from '@/hooks/useSupplierCurrencies';
import CurrencySelector from '@/components/currency/CurrencySelector';
import { SupportedCurrency, CURRENCY_SYMBOLS, CURRENCY_NAMES } from '@/types/currency';

interface SupplierCurrencyManagerProps {
  supplierId: string;
}

const SupplierCurrencyManager = ({ supplierId }: SupplierCurrencyManagerProps) => {
  const {
    supplierCurrencies,
    isLoading,
    addCurrency,
    updateCurrency,
    removeCurrency,
    isAddingCurrency
  } = useSupplierCurrencies(supplierId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [newCurrency, setNewCurrency] = useState<{
    currency: SupportedCurrency;
    is_primary: boolean;
    exchange_rate?: number;
    notes?: string;
  }>({
    currency: 'EGP',
    is_primary: false,
    exchange_rate: undefined,
    notes: ''
  });

  const handleAddCurrency = () => {
    if (!newCurrency.currency) return;

    const existingCurrency = supplierCurrencies.find(sc => sc.currency === newCurrency.currency);
    if (existingCurrency) {
      alert('هذه العملة مضافة بالفعل للمورد');
      return;
    }

    addCurrency({
      supplier_id: supplierId,
      currency: newCurrency.currency,
      is_primary: newCurrency.is_primary,
      exchange_rate: newCurrency.exchange_rate || null,
      notes: newCurrency.notes || null
    });

    setNewCurrency({
      currency: 'EGP',
      is_primary: false,
      exchange_rate: undefined,
      notes: ''
    });
    setShowAddForm(false);
  };

  const handleSetPrimary = (currencyId: string) => {
    updateCurrency({
      id: currencyId,
      updates: { is_primary: true }
    });
  };

  if (isLoading) {
    return <div className="text-center py-4">جاري تحميل العملات...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          العملات المدعومة
        </CardTitle>
        <Button 
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة عملة
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* نموذج إضافة عملة */}
        {showAddForm && (
          <Card className="border-dashed">
            <CardContent className="pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="md:col-span-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_primary"
                      checked={newCurrency.is_primary}
                      onCheckedChange={(checked) => setNewCurrency({...newCurrency, is_primary: checked})}
                    />
                    <Label htmlFor="is_primary">عملة أساسية</Label>
                  </div>
                </div>
                <div className="md:col-span-2">
                  <Label>ملاحظات</Label>
                  <Textarea
                    placeholder="ملاحظات إضافية..."
                    value={newCurrency.notes || ''}
                    onChange={(e) => setNewCurrency({...newCurrency, notes: e.target.value})}
                    rows={2}
                  />
                </div>
                <div className="md:col-span-2 flex gap-2">
                  <Button 
                    onClick={handleAddCurrency}
                    disabled={isAddingCurrency}
                  >
                    {isAddingCurrency ? "جاري الإضافة..." : "إضافة العملة"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                  >
                    إلغاء
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* قائمة العملات */}
        {supplierCurrencies.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            لا توجد عملات مضافة لهذا المورد
          </div>
        ) : (
          <div className="space-y-3">
            {supplierCurrencies.map((currency) => (
              <div
                key={currency.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={currency.is_primary ? "default" : "secondary"}>
                      {CURRENCY_NAMES[currency.currency]} ({CURRENCY_SYMBOLS[currency.currency]})
                    </Badge>
                    {currency.is_primary && (
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                    )}
                  </div>
                  {currency.exchange_rate && (
                    <span className="text-sm text-gray-600">
                      سعر الصرف: {currency.exchange_rate}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!currency.is_primary && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetPrimary(currency.id)}
                    >
                      جعل أساسية
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeCurrency(currency.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SupplierCurrencyManager;
