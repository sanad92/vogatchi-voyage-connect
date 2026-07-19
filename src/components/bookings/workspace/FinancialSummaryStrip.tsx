import { Card } from '@/components/ui/card';
import { useBookingFinancials } from '@/hooks/useBookingFinancials';

interface Props {
  bookingId: string;
}

const fmt = (n: number, ccy: string) => `${Math.round(n).toLocaleString()} ${ccy}`;

export const FinancialSummaryStrip = ({ bookingId }: Props) => {
  const { data, isLoading } = useBookingFinancials(bookingId);

  if (isLoading || !data) {
    return <Card className="p-4 text-sm text-muted-foreground">جاري حساب المؤشرات المالية...</Card>;
  }
  const t = data.totals;
  const profitTone = t.profit < 0 ? 'text-destructive' : t.profitMargin < 8 ? 'text-amber-600' : 'text-emerald-600';
  const custBalTone = t.outstandingFromCustomer > 0 ? 'text-destructive' : 'text-emerald-600';
  const supBalTone = t.outstandingToSupplier > 0 ? 'text-amber-600' : 'text-emerald-600';

  const cells = [
    { label: 'سعر البيع', value: fmt(t.selling, t.currency) },
    { label: 'تكلفة المورد', value: fmt(t.cost, t.currency) },
    { label: 'إجمالي الربح', value: fmt(t.profit, t.currency), tone: profitTone },
    { label: 'الهامش', value: `${t.profitMargin.toFixed(1)}%`, tone: profitTone },
    { label: 'مدفوع من العميل', value: fmt(t.receivedFromCustomer, t.currency), tone: 'text-emerald-600' },
    { label: 'رصيد العميل', value: fmt(t.outstandingFromCustomer, t.currency), tone: custBalTone },
    { label: 'مدفوع للمورد', value: fmt(t.paidToSupplier, t.currency), tone: 'text-emerald-600' },
    { label: 'رصيد المورد', value: fmt(t.outstandingToSupplier, t.currency), tone: supBalTone },
  ];

  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="min-w-0">
            <p className="text-[11px] text-muted-foreground truncate">{c.label}</p>
            <p className={`text-sm md:text-base font-semibold truncate ${c.tone || ''}`}>{c.value}</p>
          </div>
        ))}
      </div>
    </Card>
  );
};
