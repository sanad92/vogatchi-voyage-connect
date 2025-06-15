
import { CURRENCY_SYMBOLS, SupportedCurrency } from '@/types/currency';

interface MultiCurrencyDisplayProps {
  amount: number;
  currency?: SupportedCurrency;
  showSymbol?: boolean;
  className?: string;
  showInEGP?: boolean;
  exchangeRate?: number;
}

const MultiCurrencyDisplay = ({ 
  amount, 
  currency = 'EGP', 
  showSymbol = true, 
  className = "",
  showInEGP = false,
  exchangeRate = 1
}: MultiCurrencyDisplayProps) => {
  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const primaryDisplay = (
    <span className={className}>
      {formatAmount(amount)}
      {showSymbol && ` ${CURRENCY_SYMBOLS[currency]}`}
    </span>
  );

  if (showInEGP && currency !== 'EGP' && exchangeRate !== 1) {
    const egpAmount = amount * exchangeRate;
    return (
      <div className={className}>
        {primaryDisplay}
        <div className="text-sm text-gray-500">
          ({formatAmount(egpAmount)} ج.م)
        </div>
      </div>
    );
  }

  return primaryDisplay;
};

export default MultiCurrencyDisplay;
