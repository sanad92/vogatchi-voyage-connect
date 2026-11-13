import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { usePageTitle } from '@/hooks/usePageTitle';
import PageHeader from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, DollarSign, RotateCcw } from 'lucide-react';
import {
  useRefundRequests, useRefundActions, useTreasuryAccounts, usePendingSupplierPOs, useApproveSupplierPO,
} from '@/hooks/finance/useFinanceRpcs';

export default function FinanceApprovals() {
  usePageTitle('اعتمادات مالية');
  const { data: pos = [] } = usePendingSupplierPOs();
  const { data: refunds = [], isError: refundsError, isPending: refundsLoading } = useRefundRequests();
  const { canProcessPayments } = useSupabasePermissions();
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const { data: treasury = [] } = useTreasuryAccounts();
  const approvePO = useApproveSupplierPO();
  const { approve: approveRefund, pay: payRefund } = useRefundActions();
  const [payAccount, setPayAccount] = useState<Record<string, string>>({});

  return (
    <div className="p-4 space-y-4" dir="rtl">
      <PageHeader icon={CheckCircle2} title="الاعتمادات المالية" description="اعتماد أوامر الدفع للموردين وطلبات الاسترداد" />

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><DollarSign className="h-4 w-4" />أوامر الدفع للموردين ({pos.length})</CardTitle></CardHeader>
        <CardContent>
          {pos.length === 0 ? <div className="text-center py-6 text-muted-foreground text-sm">لا توجد أوامر معلقة</div> :
            <Table>
              <TableHeader><TableRow><TableHead>#</TableHead><TableHead>المورد</TableHead><TableHead>الحجز</TableHead><TableHead>المبلغ</TableHead><TableHead>الاستحقاق</TableHead><TableHead>الإجراء</TableHead></TableRow></TableHeader>
              <TableBody>
                {pos.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.reference_number || p.po_number || p.id.slice(0,8)}</TableCell>
                    <TableCell>{p.suppliers?.name}</TableCell>
                    <TableCell className="font-mono text-xs">{p.pilgrimage_b2b_agreement_id ? 'حج وعمرة B2B' : p.bookings?.booking_number}</TableCell>
                    <TableCell>{Number(p.amount).toLocaleString('ar-EG')} {p.currency}</TableCell>
                    <TableCell className="text-xs">{p.due_date || '—'}</TableCell>
                    <TableCell className="flex gap-1">
                      {p.pilgrimage_b2b_agreement_id ? <Button asChild size="sm" variant="link">
                        <Link to={`/payment-orders?ref=${encodeURIComponent(p.reference_number)}`}>مراجعة أمر الدفع</Link>
                      </Button> : <>
                      <Button size="sm" variant="default" onClick={() => approvePO.mutate({ po_id: p.id, approve: true })}>اعتماد</Button>
                      <Button size="sm" variant="outline" onClick={() => approvePO.mutate({ po_id: p.id, approve: false })}>رفض</Button>
                      </>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2"><RotateCcw className="h-4 w-4" />طلبات الاسترداد ({refunds.length})</CardTitle>
          <Button asChild variant="outline" size="sm"><Link to="/refund-balances">الأرصدة والاستردادات</Link></Button>
        </CardHeader>
        <CardContent>
          {refundsError ? <p role="alert" className="text-sm text-destructive">تعذر تحميل طلبات الاسترداد</p>
            : refundsLoading ? <p className="text-sm text-muted-foreground">جارٍ تحميل طلبات الاسترداد…</p>
            : refunds.length === 0 ? <div className="text-center py-6 text-muted-foreground text-sm">لا توجد طلبات</div> :
            <Table>
              <TableHeader><TableRow><TableHead>الحجز</TableHead><TableHead>العميل</TableHead><TableHead>المبلغ</TableHead><TableHead>السبب</TableHead><TableHead>الحالة</TableHead><TableHead>الإجراء</TableHead></TableRow></TableHeader>
              <TableBody>
                {refunds.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.pilgrimage_b2b_cancellation_id ? 'حج وعمرة B2B' : r.bookings?.booking_number}</TableCell>
                    <TableCell>{r.customers?.name}</TableCell>
                    <TableCell>{Number(r.amount).toLocaleString('ar-EG')} {r.currency}</TableCell>
                    <TableCell className="text-xs">{r.reason || '—'}</TableCell>
                    <TableCell><Badge>{r.status}</Badge></TableCell>
                    <TableCell className="flex gap-1 items-center">
                      {r.status === 'requested' && canProcessPayments() && (
                        <>
                          <Button size="sm" disabled={approveRefund.isPending} onClick={() => approveRefund.mutate({ refund_id: r.id, approve: true })}>اعتماد</Button>
                          <Input className="w-32" aria-label="سبب الرفض" placeholder="سبب الرفض" value={rejectionReasons[r.id] || ''}
                            onChange={event => setRejectionReasons(previous => ({ ...previous, [r.id]: event.target.value }))} />
                          <Button size="sm" variant="outline" disabled={approveRefund.isPending || !rejectionReasons[r.id]?.trim()}
                            onClick={() => approveRefund.mutate({ refund_id: r.id, approve: false, reason: rejectionReasons[r.id] })}>رفض</Button>
                        </>
                      )}
                      {r.pilgrimage_b2b_cancellation_id && r.status === 'approved' && (
                        <Button asChild size="sm" variant="link"><Link to={`/invoices?id=${r.invoice_id}`}>فتح فاتورة المجموعة</Link></Button>
                      )}
                      {!r.pilgrimage_b2b_cancellation_id && r.status === 'approved' && canProcessPayments() && (
                        <>
                          <Select value={payAccount[r.id]} onValueChange={(v) => setPayAccount({ ...payAccount, [r.id]: v })}>
                            <SelectTrigger className="w-40 h-8"><SelectValue placeholder="اختر خزينة" /></SelectTrigger>
                            <SelectContent>{treasury.filter((t: any) => t.currency === r.currency).map((t: any) => <SelectItem key={t.id} value={t.id}>{t.account_name} ({t.currency})</SelectItem>)}</SelectContent>
                          </Select>
                          <Button size="sm" disabled={!payAccount[r.id] || payRefund.isPending} onClick={() => payRefund.mutate({ refund_id: r.id, treasury_account_id: payAccount[r.id] })}>صرف المتبقي</Button>
                        </>
                      )}
                      {r.status === 'paid' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>}
        </CardContent>
      </Card>
    </div>
  );
}
