import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { ListLoadError } from '@/components/common/ListLoadError';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatMoney } from '@/lib/customerMetrics';
import { callUntypedRpc } from '@/lib/supabaseRpc';

type ReceiptReview = {
  payment_id: string | null;
  movement_id?: string;
  payment_date: string;
  amount: number;
  currency: string;
  reference_number: string | null;
  account_name: string | null;
  booking_id: string | null;
  booking_number: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  reason: 'account_missing' | 'deposit_unmatched' | 'receipt_missing' | 'receipt_not_current' | 'deposit_mismatch';
};

const pageSize = 50;
const reviewReasons: Record<ReceiptReview['reason'], string> = {
  account_missing: 'حساب الاستلام غير محدد',
  deposit_unmatched: 'الإيداع يحتاج مطابقة',
  receipt_missing: 'الدفعة المرتبطة غير موجودة',
  receipt_not_current: 'الدفعة المرتبطة غير مكتملة أو معكوسة',
  deposit_mismatch: 'بيانات الإيداع مختلفة عن الدفعة',
};

export function TreasuryReceiptReview({
  orgId, canViewBookings, canViewInvoices, canReviewDeposits,
}: {
  orgId: string;
  canViewBookings: boolean;
  canViewInvoices: boolean;
  canReviewDeposits: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const [direction, setDirection] = useState<'receipts' | 'deposits'>('receipts');
  const isDepositReview = canReviewDeposits && direction === 'deposits';
  const review = useQuery({
    queryKey: ['treasury-receipt-review', orgId, isDepositReview, offset],
    queryFn: async () => {
      const rpc = isDepositReview ? 'list_treasury_deposit_review' : 'list_treasury_receipt_review';
      const { data, error } = await callUntypedRpc<ReceiptReview[]>(rpc, { _org: orgId, _offset: offset });
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = review.data ?? [];

  return (
    <Card id="treasury-receipt-review">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4" /> مطابقة التحصيل والخزنة
        </CardTitle>
        <CardDescription>طابق الدفعة مع الإيصال أو كشف الحساب قبل اعتماد أي تسوية.</CardDescription>
      </CardHeader>
      <CardContent>
        {canReviewDeposits && (
          <div className="mb-4 flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={isDepositReview ? 'outline' : 'default'} aria-pressed={!isDepositReview}
              onClick={() => { setDirection('receipts'); setOffset(0); }}>دفعات تحتاج مراجعة</Button>
            <Button type="button" size="sm" variant={isDepositReview ? 'default' : 'outline'} aria-pressed={isDepositReview}
              onClick={() => { setDirection('deposits'); setOffset(0); }}>إيداعات التحصيل المرتبطة</Button>
          </div>
        )}
        {review.isLoading ? (
          <p className="py-6 text-center text-muted-foreground">جارٍ التحميل…</p>
        ) : review.isError ? (
          <ListLoadError message="تعذّر تحميل نتائج المطابقة" retry={() => void review.refetch()} pending={review.isFetching} />
        ) : !rows.length ? (
          <p className="py-6 text-center text-muted-foreground">
            {isDepositReview ? 'لا توجد إيداعات تحصيل مرتبطة تحتاج مراجعة في هذه الصفحة.' : 'لا توجد دفعات تحتاج مراجعة في هذه الصفحة.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>{isDepositReview ? 'مرجع الإيداع' : 'مرجع الدفعة'}</TableHead>
                <TableHead>الحجز / الفاتورة</TableHead>
                <TableHead>حساب الاستلام</TableHead>
                <TableHead className="text-end">المبلغ</TableHead>
                <TableHead>سبب المراجعة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, pageSize).map(row => (
                <TableRow key={row.movement_id ?? row.payment_id}>
                  <TableCell className="whitespace-nowrap"><bdi>{row.payment_date}</bdi></TableCell>
                  <TableCell className="font-mono" title={row.movement_id ?? row.payment_id ?? undefined}>
                    <bdi>{row.reference_number || (row.movement_id ?? row.payment_id)?.slice(0, 8) || '—'}</bdi>
                  </TableCell>
                  <TableCell className="space-y-1">
                    {row.booking_number && (
                      <div>{canViewBookings && row.booking_id ? (
                        <Link className="text-primary underline underline-offset-2" to={`/bookings/${row.booking_id}?tab=financials`}>
                          <bdi>{row.booking_number}</bdi>
                        </Link>
                      ) : <bdi>{row.booking_number}</bdi>}</div>
                    )}
                    {row.invoice_number && (
                      <div>{canViewInvoices && row.invoice_id ? (
                        <Link className="text-primary underline underline-offset-2" to={`/invoices?id=${row.invoice_id}`}>
                          <bdi>{row.invoice_number}</bdi>
                        </Link>
                      ) : <bdi>{row.invoice_number}</bdi>}</div>
                    )}
                    {!row.booking_number && !row.invoice_number && '—'}
                  </TableCell>
                  <TableCell>{row.account_name || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-end"><bdi>{formatMoney(row.amount, row.currency)}</bdi></TableCell>
                  <TableCell>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {reviewReasons[row.reason]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {(offset > 0 || rows.length > pageSize) && (
          <div className="mt-4 flex justify-end gap-2">
            <Button size="sm" variant="outline" disabled={!offset || review.isFetching} onClick={() => setOffset(offset - pageSize)}>السابق</Button>
            <Button size="sm" variant="outline" disabled={rows.length <= pageSize || review.isFetching} onClick={() => setOffset(offset + pageSize)}>التالي</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
