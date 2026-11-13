
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign } from 'lucide-react';
import { useSupplierCurrencies } from '@/hooks/useSupplierCurrencies';
import CurrencyList from './currency/CurrencyList';
import AddCurrencyForm from './currency/AddCurrencyForm';

interface SupplierCurrencyManagerProps {
  supplierId: string;
  canEdit: boolean;
}

const SupplierCurrencyManager = ({ supplierId, canEdit }: SupplierCurrencyManagerProps) => {
  const {
    supplierCurrencies,
    isLoading,
    addCurrency,
    updateCurrency,
    removeCurrency,
    isAddingCurrency
  } = useSupplierCurrencies(supplierId);

  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddCurrency = (formData: any) => {
    addCurrency({
      supplier_id: supplierId,
      currency: formData.currency,
      is_primary: formData.is_primary,
      exchange_rate: formData.exchange_rate || null,
      notes: formData.notes || null
    });

    setShowAddForm(false);
  };

  const handleSetPrimary = (currencyId: string) => {
    updateCurrency({
      id: currencyId,
      updates: { is_primary: true }
    });
  };

  const existingCurrencies = supplierCurrencies.map(sc => sc.currency);

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
        {canEdit && <Button
          onClick={() => setShowAddForm(!showAddForm)}
          size="sm"
        >
          <Plus className="w-4 h-4 ml-2" />
          إضافة عملة
        </Button>}
      </CardHeader>
      <CardContent className="space-y-4">
        <AddCurrencyForm
          isVisible={canEdit && showAddForm}
          isLoading={isAddingCurrency}
          onSubmit={handleAddCurrency}
          onCancel={() => setShowAddForm(false)}
          existingCurrencies={existingCurrencies}
        />

        <CurrencyList
          currencies={supplierCurrencies}
          onSetPrimary={canEdit ? handleSetPrimary : undefined}
          onRemove={canEdit ? removeCurrency : undefined}
        />
      </CardContent>
    </Card>
  );
};

export default SupplierCurrencyManager;
