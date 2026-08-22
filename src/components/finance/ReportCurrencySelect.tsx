import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useActiveCurrencies } from '@/hooks/useActiveCurrencies';

interface ReportCurrencySelectProps {
  value: string;
  onValueChange: (currency: string) => void;
  className?: string;
}

export default function ReportCurrencySelect({
  value,
  onValueChange,
  className = 'w-40',
}: ReportCurrencySelectProps) {
  const { data = [] } = useActiveCurrencies();
  const currencies = Array.from(new Set(['EGP', ...data.map((row) => row.currency)]));

  return (
    <div className={className}>
      <Label>عملة التقرير</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger>
          <SelectValue placeholder="اختر العملة" />
        </SelectTrigger>
        <SelectContent>
          {currencies.map((currency) => (
            <SelectItem key={currency} value={currency}>{currency}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
