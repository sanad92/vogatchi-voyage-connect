
interface EgyptianPoundDisplayProps {
  amount: number;
  showSymbol?: boolean;
  className?: string;
  showDecimals?: boolean;
}

const EgyptianPoundDisplay = ({ 
  amount, 
  showSymbol = true, 
  className = "",
  showDecimals = true 
}: EgyptianPoundDisplayProps) => {
  const formatAmount = (value: number) => {
    if (showDecimals) {
      return value.toLocaleString('ar-EG', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    }
    return Math.round(value).toLocaleString('ar-EG');
  };

  return (
    <span className={`font-medium ${className}`}>
      {formatAmount(amount)} {showSymbol && 'ج.م'}
    </span>
  );
};

export default EgyptianPoundDisplay;
