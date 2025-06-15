
import React from 'react';

interface EgyptianPoundDisplayProps {
  amount: number;
  className?: string;
  showSymbol?: boolean;
}

const EgyptianPoundDisplay = ({ 
  amount, 
  className = "", 
  showSymbol = true 
}: EgyptianPoundDisplayProps) => {
  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('ar-EG', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  return (
    <span className={className}>
      {formatAmount(amount)}
      {showSymbol && ' ج.م'}
    </span>
  );
};

export default EgyptianPoundDisplay;
