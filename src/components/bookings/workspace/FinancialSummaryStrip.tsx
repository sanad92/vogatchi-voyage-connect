import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { useBookingProfitCockpit } from '@/hooks/useBookingProfitCockpit';

interface Props {
  cockpit: ReturnType<typeof useBookingProfitCockpit>;
}

const fmt = (n: number, ccy: string) => `${n.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${ccy}`;

export const FinancialSummaryStrip = ({ cockpit: { data, isLoading, error } }: Props) => {

  if (isLoading) {
    return <Card className="p-4 text-sm text-muted-foreground">جاري حساب المؤشرات المالية...</Card>;
  }
  if (error || !data) {
    return (
      <Card className="p-4 text-sm text-destructive">
        تعذر تحميل المؤشرات المالية{error ? `: ${(error as Error).message}` : ''}
      </Card>
    );
  }
  const t = data.summary;
  const currency = data.booking.currency;
  const profitTone = t.net_contribution < 0 ? 'text-destructive' : t.net_margin_pct < 8 ? 'text-amber-600' : 'text-emerald-600';
  const custBalTone = t.customer_remaining > 0 ? 'text-destructive' : 'text-emerald-600';
  const supBalTone = t.supplier_remaining > 0 ? 'text-amber-600' : 'text-emerald-600';

  const supplierBalanceBasis = {
    supplier_invoices: 'حسب فواتير المورد المسجلة',
    cancelled_supplier_invoices: 'حسب فواتير المورد بعد الإلغاء',
    booking_cost: 'حسب تكلفة الحجز',
  }[t.supplier_due_basis];

  const cells = [
    { label: 'سعر البيع', value: fmt(t.selling, currency) },
    { label: 'تكلفة المورد', value: fmt(t.supplier_cost, currency) },
    { label: 'إجمالي الربح', value: fmt(t.gross_profit, currency), tone: profitTone },
    { label: 'صافي المساهمة', value: fmt(t.net_contribution, currency), tone: profitTone },
    { label: 'محصل من العميل', value: fmt(t.customer_collected, currency), tone: 'text-emerald-600' },
    { label: 'رصيد العميل', value: fmt(t.customer_remaining, currency), tone: custBalTone },
    { label: 'مدفوع للمورد', value: fmt(t.supplier_paid, currency), tone: 'text-emerald-600' },
    { label: 'رصيد المورد', value: fmt(t.supplier_remaining, currency), tone: supBalTone, basis: supplierBalanceBasis },
  ];

  return (
    <Card className="p-4">
      <div className="mb-3 flex justify-end"><Badge className={data.settlement.financially_complete ? 'bg-emerald-600' : ''} variant={data.settlement.financially_complete ? 'default' : 'secondary'}>{data.settlement.financially_complete ? 'مكتمل ماليًا' : 'تسوية مفتوحة'}</Badge></div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {cells.map((c) => (
          <div key={c.label} className="min-w-0">
            <p className="text-[11px] text-muted-foreground truncate">{c.label}</p>
            <p className={`text-sm md:text-base font-semibold truncate ${c.tone || ''}`}>{c.value}</p>
            {c.basis && <p className="text-xs text-muted-foreground">{c.basis}</p>}
          </div>
        ))}
      </div>
      {t.supplier_due_basis === 'supplier_invoices' && Math.abs(t.supplier_invoiced - t.supplier_cost) >= 0.01 && (
        <div className="mt-3 flex flex-wrap gap-x-2 text-xs text-amber-700 dark:text-amber-300">
          <span>الفرق بين تكلفة الحجز وفواتير المورد</span>
          <span dir="ltr">{fmt(Math.abs(t.supplier_invoiced - t.supplier_cost), currency)}</span>
        </div>
      )}
    </Card>
  );
};
