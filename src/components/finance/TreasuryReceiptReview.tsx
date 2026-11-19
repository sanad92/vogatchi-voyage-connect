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
  payment_id: string;
  payment_date: string;
  amount: number;
  currency: string;
  reference_number: string | null;
  account_name: string | null;
  booking_id: string | null;
  booking_number: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  reason: 'account_missing' | 'deposit_unmatched';
};

const pageSize = 50;

export function TreasuryReceiptReview({
  orgId, canViewBookings, canViewInvoices,
}: {
  orgId: string;
  canViewBookings: boolean;
  canViewInvoices: boolean;
}) {
  const [offset, setOffset] = useState(0);
  const review = useQuery({
    queryKey: ['treasury-receipt-review', orgId, offset],
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<ReceiptReview[]>('list_treasury_receipt_review', { _org: orgId, _offset: offset });
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = review.data ?? [];

  return (
    <Card id="treasury-receipt-review">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4" /> دفعات تحتاج مراجعة
        </CardTitle>
        <CardDescription>طابق الدفعة مع الإيصال أو كشف الحساب قبل اعتماد أي تسوية.</CardDescription>
      </CardHeader>
      <CardContent>
        {review.isLoading ? (
          <p className="py-6 text-center text-muted-foreground">جارٍ التحميل…</p>
        ) : review.isError ? (
          <ListLoadError message="تعذّر تحميل الدفعات للمراجعة" retry={() => void review.refetch()} pending={review.isFetching} />
        ) : !rows.length ? (
          <p className="py-6 text-center text-muted-foreground">لا توجد دفعات تحتاج مراجعة في هذه الصفحة.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>التاريخ</TableHead>
                <TableHead>مرجع الدفعة</TableHead>
                <TableHead>الحجز / الفاتورة</TableHead>
                <TableHead>حساب الاستلام</TableHead>
                <TableHead className="text-end">المبلغ</TableHead>
                <TableHead>سبب المراجعة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, pageSize).map(row => (
                <TableRow key={row.payment_id}>
                  <TableCell className="whitespace-nowrap"><bdi>{row.payment_date}</bdi></TableCell>
                  <TableCell className="font-mono" title={row.payment_id}><bdi>{row.reference_number || row.payment_id.slice(0, 8)}</bdi></TableCell>
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
                      {row.reason === 'account_missing' ? 'حساب الاستلام غير محدد' : 'الإيداع يحتاج مطابقة'}
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
