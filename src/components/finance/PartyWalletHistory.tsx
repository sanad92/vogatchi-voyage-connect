import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { RefundBalance } from '@/hooks/finance/useRefundBalances';
import { usePartyWalletPayments } from '@/hooks/finance/usePartyWalletPayments';
import { listPartyWalletMovements } from '@/lib/partyWalletMovements';
import { formatRefundAmount } from './RefundMovements';

const PAGE_SIZE = 15;

function formatMovementDate(date: string) {
  return new Date(date).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' });
}

export function PartyWalletHistory({ kind, partyId, refunds, refundError }: {
  kind: RefundBalance['kind'];
  partyId: string;
  refunds?: RefundBalance[];
  refundError: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const payments = usePartyWalletPayments(kind, partyId);
  const movements = useMemo(
    () => listPartyWalletMovements(payments.data ?? [], refunds ?? []),
    [payments.data, refunds],
  );
  const hasError = refundError || payments.isError;
  const isLoading = (!refunds && !refundError) || payments.isPending;

  return (
    <section className="space-y-2" aria-label="سجل حركات المحفظة">
      <h3 className="font-medium">سجل حركات المحفظة</h3>
      {hasError && <p role="alert" className="text-sm text-destructive">تعذر تحميل بعض حركات المحفظة</p>}
      {isLoading && <p className="text-sm text-muted-foreground">جارٍ تحميل الحركات…</p>}
      {!hasError && !isLoading && movements.length === 0 && (
        <p className="text-sm text-muted-foreground">لا توجد حركات مسجلة</p>
      )}
      {movements.length > 0 && (
        <Table containerClassName="rounded-md border">
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="text-start">التاريخ</TableHead>
              <TableHead scope="col" className="text-start">الحركة</TableHead>
              <TableHead scope="col" className="text-start">المبلغ</TableHead>
              <TableHead scope="col" className="text-start">أثرها على رصيد الاسترداد</TableHead>
              <TableHead scope="col" className="text-start">حركة الأموال</TableHead>
              <TableHead scope="col" className="text-start">المستند والمرجع</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.slice(0, visibleCount).map(movement => (
              <TableRow key={movement.id}>
                <TableCell className="whitespace-nowrap">
                  {movement.date ? <time dateTime={movement.date}>{formatMovementDate(movement.date)}</time> : '—'}
                </TableCell>
                <TableCell className="font-medium">{movement.label}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">{formatRefundAmount(movement.amount, movement.currency)}</TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {movement.balanceDelta === 0 ? '—' : (
                    <bdi>{movement.balanceDelta > 0 ? '+' : '−'}{formatRefundAmount(Math.abs(movement.balanceDelta), movement.currency)}</bdi>
                  )}
                </TableCell>
                <TableCell>
                  {movement.cashDirection ? (
                    <>
                      <span>{movement.cashDirection === 'in' ? 'وارد' : 'صادر'}</span>
                      {movement.treasuryName && <span className="block text-muted-foreground">{movement.treasuryName}</span>}
                    </>
                  ) : '—'}
                </TableCell>
                <TableCell className="break-words">
                  {movement.document && <span className="block">{movement.document}</span>}
                  {movement.reference && <span className="block text-muted-foreground">{movement.reference}</span>}
                  {!movement.document && !movement.reference && '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {visibleCount < movements.length && (
        <Button variant="outline" size="sm" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>
          عرض المزيد من الحركات
        </Button>
      )}
    </section>
  );
}
