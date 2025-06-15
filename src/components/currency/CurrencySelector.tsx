
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
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {SUPPORTED_CURRENCIES.map((currency) => (
          <SelectItem key={currency} value={currency}>
            {CURRENCY_NAMES[currency]} ({CURRENCY_SYMBOLS[currency]})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CurrencySelector;
