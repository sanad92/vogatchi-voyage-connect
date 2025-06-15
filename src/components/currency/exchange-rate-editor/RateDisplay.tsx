
import { Input } from '@/components/ui/input';
import { CURRENCY_SYMBOLS } from '@/types/currency';

interface RateDisplayProps {
  latest: any;
  isEditing: boolean;
  newRate: string;
  onRateChange: (value: string) => void;
  isUpdating: boolean;
}

const RateDisplay = ({ latest, isEditing, newRate, onRateChange, isUpdating }: RateDisplayProps) => {
  return (
    <div className="text-center">
      {isEditing ? (
        <Input
          type="number"
          step="0.000001"
          value={newRate}
          onChange={(e) => onRateChange(e.target.value)}
          className="text-center text-xl font-bold"
          disabled={isUpdating}
        />
      ) : (
        <div className="text-2xl font-bold text-blue-600">
          {latest.rate.toFixed(6)}
        </div>
      )}
      <p className="text-sm text-gray-500 mt-1">
        1 {CURRENCY_SYMBOLS[latest.from_currency as keyof typeof CURRENCY_SYMBOLS]} = {latest.rate.toFixed(6)} {CURRENCY_SYMBOLS[latest.to_currency as keyof typeof CURRENCY_SYMBOLS]}
      </p>
    </div>
  );
};

export default RateDisplay;
