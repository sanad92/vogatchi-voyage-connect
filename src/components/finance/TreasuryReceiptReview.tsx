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
  payment_date: string | null;
  amount: number;
  currency: string | null;
  reference_number: string | null;
  account_name: string | null;
  booking_id: string | null;
  booking_number: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  supplier_name?: string | null;
  reason: 'account_missing' | 'deposit_unmatched' | 'receipt_missing' | 'receipt_not_current' | 'deposit_mismatch'
    | 'legacy_paid_invoice_evidence_missing' | 'supplier_cash_treasury_missing';
};

const pageSize = 50;
const reviewTabs = {
  receipts: { label: 'دفعات تحتاج مراجعة', rpc: 'list_treasury_receipt_review', reference: 'مرجع الدفعة',
    emptyMessage: 'لا توجد دفعات تحتاج مراجعة في هذه الصفحة.' },
  deposits: { label: 'إيداعات التحصيل المرتبطة', rpc: 'list_treasury_deposit_review', reference: 'مرجع الإيداع',
    emptyMessage: 'لا توجد إيداعات تحصيل مرتبطة تحتاج مراجعة في هذه الصفحة.' },
  legacyInvoices: { label: 'فواتير تاريخية تحتاج إثبات تحصيل', rpc: 'list_legacy_paid_invoice_review', reference: 'مرجع الفاتورة',
    emptyMessage: 'لا توجد فواتير من التسوية القديمة تحتاج إثبات تحصيل في هذه الصفحة.' },
  supplierCash: { label: 'مدفوعات موردين نقدية تحتاج مطابقة', rpc: 'list_legacy_supplier_cash_payout_review', reference: 'مرجع الصرف',
    emptyMessage: 'لا توجد مدفوعات نقدية للموردين تحتاج مطابقة في هذه الصفحة.' },
} as const;
const reviewReasons: Record<ReceiptReview['reason'], string> = {
  account_missing: 'حساب الاستلام غير محدد',
  deposit_unmatched: 'الإيداع يحتاج مطابقة',
  receipt_missing: 'الدفعة المرتبطة غير موجودة',
  receipt_not_current: 'الدفعة المرتبطة غير مكتملة أو معكوسة',
  deposit_mismatch: 'بيانات الإيداع مختلفة عن الدفعة',
  legacy_paid_invoice_evidence_missing: 'مسجلة مدفوعة في تسوية قديمة بلا إيصال مكتمل مرتبط',
  supplier_cash_treasury_missing: 'صرف نقدي مسجّل بلا رابط لحساب الخزنة',
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
  const [direction, setDirection] = useState<keyof typeof reviewTabs>('receipts');
  const reviewDirections = canReviewDeposits
    ? ['receipts', 'deposits', 'legacyInvoices', 'supplierCash'] as const
    : ['receipts', 'supplierCash'] as const;
  const activeDirection = canReviewDeposits || direction === 'supplierCash' ? direction : 'receipts';
  const activeTab = reviewTabs[activeDirection];
  const isLegacyReview = activeDirection === 'legacyInvoices';
  const isSupplierReview = activeDirection === 'supplierCash';
  const review = useQuery({
    queryKey: ['treasury-receipt-review', orgId, activeDirection, offset],
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<ReceiptReview[]>(activeTab.rpc, { _org: orgId, _offset: offset });
      if (error) throw error;
      return data ?? [];
    },
  });
  const rows = review.data ?? [];

  return (
    <Card id="treasury-receipt-review">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4" /> مطابقة التحصيل والصرف مع الخزنة
        </CardTitle>
        <CardDescription>طابق الدفعة مع الإيصال أو كشف الحساب قبل اعتماد أي تسوية.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {reviewDirections.map(tab => (
            <Button key={tab} type="button" size="sm" variant={activeDirection === tab ? 'default' : 'outline'}
              aria-pressed={activeDirection === tab} onClick={() => { setDirection(tab); setOffset(0); }}>
              {reviewTabs[tab].label}
            </Button>
          ))}
        </div>
        {isLegacyReview && (
          <p className="mb-4 text-sm text-muted-foreground">
            المبلغ الظاهر هو المسجّل كمدفوع في الفاتورة القديمة. طابقه بمستند التحصيل أو كشف الحساب.
          </p>
        )}
        {isSupplierReview && (
          <p className="mb-4 text-sm text-muted-foreground">
            القائمة للقراءة فقط. استخدم مستند الصرف وكشف الخزنة لتحديد الحساب اللي اتصرف منه المبلغ.
          </p>
        )}
        {review.isLoading ? (
          <p className="py-6 text-center text-muted-foreground">جارٍ التحميل…</p>
        ) : review.isError ? (
          <ListLoadError message="تعذّر تحميل نتائج المطابقة" retry={() => void review.refetch()} pending={review.isFetching} />
        ) : !rows.length ? (
          <p className="py-6 text-center text-muted-foreground">
            {activeTab.emptyMessage}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{isLegacyReview ? 'تاريخ إصدار الفاتورة' : isSupplierReview ? 'تاريخ الصرف' : 'التاريخ'}</TableHead>
                <TableHead>{activeTab.reference}</TableHead>
                <TableHead>{isSupplierReview ? 'المورد / الحجز' : 'الحجز / الفاتورة'}</TableHead>
                {!isLegacyReview && !isSupplierReview && <TableHead>حساب الاستلام</TableHead>}
                <TableHead className="text-end">{isLegacyReview || isSupplierReview ? 'المبلغ المسجّل كمدفوع' : 'المبلغ'}</TableHead>
                <TableHead>سبب المراجعة</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.slice(0, pageSize).map(row => (
                <TableRow key={row.movement_id ?? row.payment_id ?? row.invoice_id}>
                  <TableCell className="whitespace-nowrap"><bdi>{row.payment_date ?? '—'}</bdi></TableCell>
                  <TableCell className="font-mono" title={row.movement_id ?? row.payment_id ?? undefined}>
                    <bdi>{row.reference_number || (row.movement_id ?? row.payment_id)?.slice(0, 8) || '—'}</bdi>
                  </TableCell>
                  <TableCell className="space-y-1">
                    {isSupplierReview && row.supplier_name && <div><bdi>{row.supplier_name}</bdi></div>}
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
                    {!row.booking_number && !row.invoice_number && !row.supplier_name && '—'}
                  </TableCell>
                  {!isLegacyReview && !isSupplierReview && <TableCell>{row.account_name || '—'}</TableCell>}
                  <TableCell className="whitespace-nowrap text-end">
                    <bdi>{row.currency ? formatMoney(row.amount, row.currency) : row.amount.toLocaleString('ar-EG')}</bdi>
                    {!row.currency && <div className="text-xs text-muted-foreground">العملة غير مسجلة</div>}
                  </TableCell>
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
