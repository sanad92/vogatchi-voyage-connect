
import { CURRENCY_SYMBOLS, SupportedCurrency } from '@/types/currency';

interface MultiCurrencyDisplayProps {
  amount: number;
  currency?: SupportedCurrency;
  showSymbol?: boolean;
  className?: string;
}

const MultiCurrencyDisplay = ({ 
  amount, 
  currency = 'EGP', 
  showSymbol = true, 
  className = "" 
}: MultiCurrencyDisplayProps) => {
  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <span className={className}>
      {formatAmount(amount)}
      {showSymbol && ` ${CURRENCY_SYMBOLS[currency]}`}
    </span>
  );
};

export default MultiCurrencyDisplay;
