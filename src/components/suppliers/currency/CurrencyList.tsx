
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Trash2 } from 'lucide-react';
import { CURRENCY_SYMBOLS, CURRENCY_NAMES, SupportedCurrency } from '@/types/currency';

interface SupplierCurrency {
  id: string;
  currency: SupportedCurrency;
  is_primary: boolean;
  exchange_rate?: number;
  notes?: string;
}

interface CurrencyListProps {
  currencies: SupplierCurrency[];
  onSetPrimary: (currencyId: string) => void;
  onRemove: (currencyId: string) => void;
}

const CurrencyList = ({ currencies, onSetPrimary, onRemove }: CurrencyListProps) => {
  if (currencies.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        لا توجد عملات مضافة لهذا المورد
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {currencies.map((currency) => (
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
                onClick={() => onSetPrimary(currency.id)}
              >
                جعل أساسية
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onRemove(currency.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CurrencyList;
