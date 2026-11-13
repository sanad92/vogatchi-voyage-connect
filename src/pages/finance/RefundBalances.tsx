import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useOrgId } from '@/hooks/useOrgId';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import {
  canSettleRefund, remainingRefundBalance, useRefundBalanceActions, useRefundBalances, type RefundBalance,
} from '@/hooks/finance/useRefundBalances';
import { compareRefundFollowUps, isOpenRefund, isRefundFollowUpOverdue } from '@/lib/refundFollowUp';
import { RefundForm } from '@/components/finance/RefundForm';
import { RefundFollowUpDialog } from '@/components/finance/RefundFollowUpDialog';
import { RefundMovements, formatRefundAmount as money, refundStatusLabels } from '@/components/finance/RefundMovements';
import PageHeader from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type DialogState = { orgId: string } & (
  { action: 'create' } | { action: 'settle' | 'followUp'; id: string; kind: RefundBalance['kind'] }
);

export default function RefundBalances() {
  usePageTitle('الأرصدة والاستردادات');
  const orgId = useOrgId();
  const [params, setParams] = useSearchParams();
  const selectedKind = params.get('kind');
  const kind = selectedKind === 'customer' || selectedKind === 'supplier' ? selectedKind : 'both';
  const party = kind === 'both' ? undefined : params.get('party') || undefined;
  const view = params.get('view');
  const { hasPermission, getPermissionScope } = useSupabasePermissions();
  const canRead = hasPermission('financial_view') && getPermissionScope('financial_view') === 'organization';
  const canManage = canRead && hasPermission('payments_process') && getPermissionScope('payments_process') === 'organization';
  const customers = useRefundBalances('customer', kind === 'customer' ? party : undefined, true, canRead && kind !== 'supplier');
  const suppliers = useRefundBalances('supplier', kind === 'supplier' ? party : undefined, false, canRead && kind !== 'customer');
  const { claim } = useRefundBalanceActions();
  const [dialog, setDialog] = useState<DialogState>();
  const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Africa/Cairo' }).format(new Date());
  const allBalances = [
    ...(kind === 'supplier' ? [] : customers.data ?? []).filter(row => !row.pilgrimageB2B),
    ...(kind === 'customer' ? [] : suppliers.data ?? []),
  ];
  const balances = allBalances.filter(row => view === 'all'
    || (view === 'overdue' ? isRefundFollowUpOverdue(row, today) : isOpenRefund(row)));
  balances.sort(view === 'all'
    ? (a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)
    : compareRefundFollowUps);
  const queries = kind === 'both' ? [customers, suppliers] : [kind === 'customer' ? customers : suppliers];
  const isPending = queries.some(query => query.isPending);
  const hasError = queries.some(query => query.isError);
  const activeDialog = canManage && dialog?.orgId === orgId ? dialog : undefined;
  const dialogBalance = activeDialog && activeDialog.action !== 'create'
    ? allBalances.find(row => row.kind === activeDialog.kind && row.id === activeDialog.id) : undefined;
  const closeDialog = () => setDialog(undefined);

  function changeFilters(nextKind: string, nextView: string | null, nextParty?: string) {
    const next = new URLSearchParams();
    if (nextKind !== 'both') next.set('kind', nextKind);
    if (nextView === 'all' || nextView === 'overdue') next.set('view', nextView);
    if (nextParty) next.set('party', nextParty);
    setParams(next);
  }

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <PageHeader icon={Wallet} title="الأرصدة والاستردادات"
        description="تابع المبالغ المطلوب ردّها للعملاء وتحصيلها من الموردين." />
      {canRead && <>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={kind} onValueChange={value => changeFilters(value, view)}>
            <TabsList>
              <TabsTrigger value="both">كل الأطراف</TabsTrigger>
              <TabsTrigger value="customer">العملاء</TabsTrigger>
              <TabsTrigger value="supplier">الموردون</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant={view !== 'all' && view !== 'overdue' ? 'secondary' : 'outline'}
            onClick={() => changeFilters(kind, null, party)}>الأرصدة المفتوحة</Button>
          <Button variant={view === 'overdue' ? 'secondary' : 'outline'}
            onClick={() => changeFilters(kind, 'overdue', party)}>المتابعات المتأخرة</Button>
          <Button variant={view === 'all' ? 'secondary' : 'outline'}
            onClick={() => changeFilters(kind, 'all', party)}>عرض كل الحركات</Button>
          {party && <Button variant="ghost" onClick={() => changeFilters(kind, view)}>إلغاء تصفية الطرف</Button>}
          {kind !== 'supplier' && <Button asChild variant="outline"><Link to="/finance-approvals">اعتمادات الاسترداد</Link></Button>}
          {kind !== 'customer' && canManage && orgId && <Button onClick={() => setDialog({ orgId, action: 'create' })}>مطالبة استرداد جديدة</Button>}
        </div>
        {isPending && <p className="text-sm text-muted-foreground">جارٍ تحميل الأرصدة…</p>}
        {hasError && <div role="alert" className="flex items-center gap-2 text-destructive">
          تعذر تحميل بعض الأرصدة <Button variant="outline" onClick={() => void Promise.all(queries.map(query => query.refetch()))}>إعادة المحاولة</Button>
        </div>}
        {!isPending && !hasError && balances.length === 0 && (
          <p className="text-sm text-muted-foreground">{view === 'overdue' ? 'لا توجد متابعات متأخرة.' : 'لا توجد أرصدة مطابقة.'}</p>
        )}
        {balances.map(row => {
          const overdue = isRefundFollowUpOverdue(row, today);
          const open = isOpenRefund(row);
          return (
            <Card key={`${row.kind}:${row.id}`}>
              <CardHeader className="pb-2">
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{row.kind === 'customer' ? 'استرداد عميل' : 'استرداد مورد'}</Badge>
                    {row.partyId ? <Link className="hover:underline" to={`/${row.kind}-ledger?id=${row.partyId}`}>{row.partyName || 'كشف الحساب'}</Link> : row.partyName}
                  </div>
                  <span>{refundStatusLabels[row.status] || row.status}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                  {row.bookingNumber && <span>الحجز {row.bookingNumber}</span>}
                  <span>المستند الأصلي {row.invoiceNumber || row.source || '—'}</span>
                  <span>المبلغ الأصلي {money(row.amount, row.currency)}</span>
                  {(open || row.status === 'paid' || row.status === 'settled') && <>
                    <span>تمت تسويته {money(Number(row.amount) - remainingRefundBalance(row), row.currency)}</span>
                    <strong>المتبقي {money(remainingRefundBalance(row), row.currency)}</strong>
                  </>}
                  {row.reference && <span>{row.reference}</span>}
                </div>
                {(open || row.followUpOn) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">موعد المتابعة</span>
                    {row.followUpOn
                      ? <time dateTime={row.followUpOn}>{new Date(row.followUpOn).toLocaleDateString('ar-EG', { timeZone: 'UTC' })}</time>
                      : <span>غير محدد</span>}
                    {overdue && <Badge variant="destructive">متأخر</Badge>}
                    {canManage && orgId && open && (
                      <Button size="sm" variant="outline" onClick={() => setDialog({ orgId, action: 'followUp', id: row.id, kind: row.kind })}>
                        تعديل موعد المتابعة
                      </Button>
                    )}
                  </div>
                )}
                <RefundMovements balance={row} />
                {canManage && orgId && canSettleRefund(row)
                  && <Button size="sm" onClick={() => setDialog({ orgId, action: 'settle', id: row.id, kind: row.kind })}>تسوية الرصيد</Button>}
                {canManage && row.kind === 'supplier' && row.status === 'pending' && <div className="flex gap-2">
                  <Button size="sm" disabled={claim.isPending} onClick={() => claim.mutate({ id: row.id, action: 'confirm' })}>تأكيد رصيد المورد</Button>
                  <Button size="sm" variant="outline" disabled={claim.isPending} onClick={() => claim.mutate({ id: row.id, action: 'reject' })}>رفض المطالبة</Button>
                </div>}
              </CardContent>
            </Card>
          );
        })}
      </>}
      {activeDialog?.action === 'create' && <RefundForm key={orgId} onClose={closeDialog} />}
      {activeDialog?.action === 'settle' && dialogBalance && (
        <RefundForm key={`${orgId}:${dialogBalance.id}`} balance={dialogBalance} onClose={closeDialog} />
      )}
      {activeDialog?.action === 'followUp' && dialogBalance && (
        <RefundFollowUpDialog key={`${orgId}:${dialogBalance.id}`} balance={dialogBalance} onClose={closeDialog} />
      )}
    </div>
  );
}
