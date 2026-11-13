import { Link } from 'react-router-dom';
import { useRefundBalances, remainingRefundBalance } from '@/hooks/finance/useRefundBalances';
import { formatRefundAmount } from './RefundMovements';
import { PartyWalletHistory } from './PartyWalletHistory';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function RefundLedgerSummary({ kind, partyId, showHistory = false }: {
  kind: 'customer' | 'supplier';
  partyId: string;
  showHistory?: boolean;
}) {
  const { data, isError, isPending } = useRefundBalances(kind, partyId, showHistory);
  const totals = new Map<string, number>();
  for (const row of data ?? []) {
    if (row.pilgrimageB2B || !['approved', 'confirmed'].includes(row.status)) continue;
    const remaining = remainingRefundBalance(row);
    if (remaining > 0) totals.set(row.currency, (totals.get(row.currency) ?? 0) + Math.round(remaining * 100));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">
          {showHistory
            ? kind === 'customer' ? 'محفظة العميل' : 'محفظة المورد'
            : kind === 'customer' ? 'استرداد مستحق للعميل' : 'رصيد استرداد مؤكد لدى المورد'}
        </CardTitle>
        <Button asChild size="sm" variant="outline" className="print:hidden">
          <Link to={`/refund-balances?kind=${kind}&party=${partyId}&view=all`}>إدارة الأرصدة والاستردادات</Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-4 text-sm">
        {isError && <span role="alert" className="text-destructive">تعذر تحميل أرصدة الاسترداد</span>}
        {isPending && <span>جارٍ تحميل الأرصدة…</span>}
        {data && totals.size === 0 && <span>لا توجد أرصدة استرداد مفتوحة</span>}
        {totals.size > 0 && <span className="text-muted-foreground">رصيد الاسترداد المتاح</span>}
        {[...totals].map(([currency, cents]) => <strong key={currency}>{formatRefundAmount(cents / 100, currency)}</strong>)}
      </CardContent>
      {showHistory && (
        <CardContent>
          <PartyWalletHistory key={`${kind}:${partyId}`} kind={kind} partyId={partyId} refunds={data} refundError={isError} />
        </CardContent>
      )}
    </Card>
  );
}
