
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CURRENCY_NAMES, CURRENCY_SYMBOLS, SupportedCurrency, SUPPORTED_CURRENCIES } from '@/types/currency';

interface CurrencySelectorProps {
  value: SupportedCurrency;
  onValueChange: (currency: SupportedCurrency) => void;
  placeholder?: string;
  disabled?: boolean;
}

const CurrencySelector = ({ 
  value, 
  onValueChange, 
  placeholder = "اختر العملة",
  disabled = false 
}: CurrencySelectorProps) => {
  // ترتيب العملات مع جعل EGP في المقدمة
  const orderedCurrencies = ['EGP', 'USD', 'SAR'] as const;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {orderedCurrencies.map((currency) => (
          <SelectItem key={currency} value={currency}>
            {CURRENCY_NAMES[currency]} ({CURRENCY_SYMBOLS[currency]})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;
