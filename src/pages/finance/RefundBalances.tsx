import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Wallet } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { useTreasuryAccounts } from '@/hooks/finance/useFinanceRpcs';
import {
  remainingRefundBalance, useRefundBalanceActions, useRefundBalances, type RefundBalance,
} from '@/hooks/finance/useRefundBalances';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const labels: Record<string, string> = {
  approved: 'مستحق للعميل', paid: 'تمت التسوية', pending: 'بانتظار تأكيد المورد',
  confirmed: 'رصيد مؤكد', rejected: 'مرفوض', settled: 'تمت التسوية',
};

const money = (amount: number, currency: string) =>
  `${Number(amount).toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${currency}`;

function RefundForm({ balance, onClose }: { balance?: RefundBalance; onClose: () => void }) {
  const orgId = useOrgId();
  const [method, setMethod] = useState<'treasury' | 'document'>('treasury');
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [reference, setReference] = useState('');
  const [search, setSearch] = useState('');
  const request = useRef<{ payload: string; id: string }>();
  const { settle, claim } = useRefundBalanceActions();
  const treasury = useTreasuryAccounts();
  const sourceInvoice = !balance;
  const supplier = balance?.kind === 'supplier';

  const documents = useQuery({
    queryKey: ['refund-settlement-documents', orgId, balance?.id, search],
    enabled: !!orgId && (sourceInvoice ? search.trim().length >= 2 : method === 'document'),
    queryFn: async () => {
      if (sourceInvoice) {
        const { data, error } = await supabase.from('supplier_invoices')
          .select('*,suppliers(name)')
          .eq('organization_id', orgId!).neq('status', 'cancelled').gt('amount_paid', 0)
          .ilike('invoice_number', `%${search.trim().replace(/[%_\\]/g, '')}%`)
          .order('invoice_date', { ascending: false }).limit(30);
        if (error) throw error;
        return data.filter(row => !('pilgrimage_b2b_agreement_id' in row && row.pilgrimage_b2b_agreement_id)).map(row => ({ id: row.id, label: `${row.invoice_number} · ${row.suppliers?.name ?? ''} · ${money(row.amount_paid, row.currency)}` }));
      }
      if (supplier) {
        const { data, error } = await supabase.from('supplier_payment_orders')
          .select('*')
          .eq('organization_id', orgId!).eq('supplier_id', balance!.partyId!).eq('currency', balance!.currency)
          .eq('approval_status', 'approved').in('status', ['approved', 'pending', 'partially_paid'])
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data.filter(row => !('pilgrimage_b2b_agreement_id' in row && row.pilgrimage_b2b_agreement_id)).map(row => ({ id: row.id, label: `${row.reference_number} · ${money(row.amount, row.currency)}` }));
      }
      const { data, error } = await supabase.from('invoices')
        .select('*')
        .eq('organization_id', orgId!).eq('customer_id', balance!.partyId!)
        .eq('currency', balance!.currency).eq('is_demo', false)
        .not('status', 'in', '(draft,cancelled,paid)').gt('remaining_amount', 0)
        .order('issued_date', { ascending: false });
      if (error) throw error;
      return data.filter(row => (!balance?.bookingId || row.booking_id !== balance.bookingId)
        && !('pilgrimage_b2b_agreement_id' in row && row.pilgrimage_b2b_agreement_id))
        .map(row => ({ id: row.id, label: `${row.invoice_number} · ${money(row.remaining_amount ?? 0, balance!.currency)}` }));
    },
  });

  const options = sourceInvoice || method === 'document' ? documents.data ?? [] : (treasury.data ?? [])
    .filter(account => account.currency === balance.currency)
    .map(account => ({ id: account.id as string, label: account.account_name as string }));
  const pending = claim.isPending || settle.isPending;
  const numericAmount = Number(amount);
  const needsReference = sourceInvoice || supplier || method === 'document';
  const canSubmit = !pending && options.some(option => option.id === target) && numericAmount > 0
    && (!balance || numericAmount <= remainingRefundBalance(balance)) && (!needsReference || !!reference.trim());

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    const payload = JSON.stringify([target, numericAmount, method, reference.trim()]);
    if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
    const id = request.current.id;
    if (!balance) {
      claim.mutate({ id, action: 'create', invoiceId: target, amount: numericAmount, reference }, { onSuccess: onClose });
    } else {
      settle.mutate({
        id, amount: numericAmount, reference, kind: balance.kind,
        sourceId: balance.id, destination: method, targetId: target,
      }, { onSuccess: onClose });
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !pending) onClose(); }}>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>{sourceInvoice ? 'مطالبة استرداد من مورد' : 'تسوية رصيد الاسترداد'}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {balance && <>
            <p className="text-sm text-muted-foreground">الرصيد المتبقي {money(remainingRefundBalance(balance), balance.currency)}</p>
            <div className="space-y-2">
              <Label htmlFor="refund-method">طريقة التسوية</Label>
              <Select value={method} onValueChange={(value: typeof method) => { setMethod(value); setTarget(''); }} disabled={pending}>
                <SelectTrigger id="refund-method"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="treasury">{supplier ? 'إثبات استلام المبلغ' : 'إثبات صرف المبلغ'}</SelectItem>
                  <SelectItem value="document">{supplier ? 'خصم من أمر دفع' : 'استخدام الرصيد في فاتورة'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>}
          {sourceInvoice && <div className="space-y-2">
            <Label htmlFor="refund-source-search">ابحث برقم فاتورة المورد</Label>
            <Input id="refund-source-search" value={search} disabled={pending} onChange={e => { setSearch(e.target.value); setTarget(''); }} />
          </div>}
          <div className="space-y-2">
            <Label htmlFor="refund-target">{sourceInvoice ? 'فاتورة المورد الأصلية' : method === 'treasury' ? 'الخزينة' : supplier ? 'أمر الدفع' : 'الفاتورة'}</Label>
            <Select value={target} onValueChange={setTarget} disabled={pending || options.length === 0}>
              <SelectTrigger id="refund-target"><SelectValue placeholder="اختر من القائمة" /></SelectTrigger>
              <SelectContent>{options.map(option => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}</SelectContent>
            </Select>
            {(documents.isError || (!sourceInvoice && method === 'treasury' && treasury.isError)) && <p role="alert" className="text-sm text-destructive">تعذر تحميل الخيارات</p>}
            {documents.isFetching && <p className="text-sm text-muted-foreground">جارٍ تحميل الخيارات</p>}
            {options.length === 0 && (sourceInvoice || method === 'document') && documents.isSuccess && !documents.isFetching && <p className="text-sm text-muted-foreground">لا توجد مستندات مطابقة</p>}
            {options.length === 0 && !sourceInvoice && method === 'treasury' && treasury.isSuccess && <p className="text-sm text-muted-foreground">لا توجد خزينة مطابقة للعملة</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-amount">المبلغ</Label>
            <Input id="refund-amount" type="number" min="0.01" step="0.01" max={balance ? remainingRefundBalance(balance) : undefined}
              required disabled={pending} value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="refund-reference">{sourceInvoice ? 'مرجع طلب المورد' : method === 'document' && !supplier ? 'مرجع موافقة العميل' : 'مرجع التسوية'}</Label>
            <Input id="refund-reference" maxLength={200} required={needsReference} disabled={pending} value={reference} onChange={e => setReference(e.target.value)} />
          </div>
          <Button type="submit" disabled={!canSubmit}>{pending ? 'جارٍ الحفظ…' : 'تسجيل'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function RefundBalances() {
  usePageTitle('الأرصدة والاستردادات');
  const orgId = useOrgId();
  const [params, setParams] = useSearchParams();
  const kind = params.get('kind') === 'supplier' ? 'supplier' : 'customer';
  const party = params.get('party') || undefined;
  const query = useRefundBalances(kind, party);
  const { claim } = useRefundBalanceActions();
  const { canProcessPayments } = useSupabasePermissions();
  const [dialog, setDialog] = useState<{ orgId: string; balance?: RefundBalance }>();
  const [openOnly, setOpenOnly] = useState(true);
  const balances = query.data?.filter(row => !openOnly || !['paid', 'rejected', 'settled'].includes(row.status));
  const canManage = canProcessPayments();

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <PageHeader icon={Wallet} title="الأرصدة والاستردادات"
        description="تابع مستحقات العملاء وأرصدة الموردين وتاريخ تسويتها." />
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={kind} onValueChange={value => setParams({ kind: value })}>
          <TabsList><TabsTrigger value="customer">العملاء</TabsTrigger><TabsTrigger value="supplier">الموردون</TabsTrigger></TabsList>
        </Tabs>
        <Button variant={openOnly ? 'secondary' : 'outline'} onClick={() => setOpenOnly(value => !value)}>
          {openOnly ? 'عرض كل الحركات' : 'عرض الأرصدة المفتوحة'}
        </Button>
        {party && <Button variant="ghost" onClick={() => setParams({ kind })}>عرض كل الأطراف</Button>}
        {kind === 'customer' && <Button asChild variant="outline"><Link to="/finance-approvals">اعتمادات الاسترداد</Link></Button>}
        {kind === 'supplier' && canManage && orgId && <Button onClick={() => setDialog({ orgId })}>مطالبة استرداد جديدة</Button>}
      </div>
      {query.isPending && <p className="text-sm text-muted-foreground">جارٍ تحميل الأرصدة…</p>}
      {query.isError && <div role="alert" className="flex items-center gap-2 text-destructive">
        تعذر تحميل الأرصدة <Button variant="outline" onClick={() => void query.refetch()}>إعادة المحاولة</Button>
      </div>}
      {balances?.length === 0 && <p className="text-sm text-muted-foreground">لا توجد أرصدة مطابقة.</p>}
      {balances?.map(row => (
        <Card key={row.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
              {row.partyId ? <Link className="hover:underline" to={`/${kind}-ledger?id=${row.partyId}`}>{row.partyName || 'كشف الحساب'}</Link> : row.partyName}
              <span>{labels[row.status] || row.status}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span>المستند الأصلي {row.source || '—'}</span>
              <span>المبلغ {money(row.amount, row.currency)}</span>
              {['approved', 'confirmed'].includes(row.status) && <strong>المتبقي {money(remainingRefundBalance(row), row.currency)}</strong>}
              {row.reference && <span>{row.reference}</span>}
            </div>
            {row.movements.length > 0 && <details>
              <summary className="cursor-pointer text-primary">حركات التسوية ({row.movements.length})</summary>
              <ul className="mt-2 space-y-1">
                {[...row.movements].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(movement => (
                  <li key={movement.id} className="flex flex-wrap gap-x-3">
                    <span>{new Date(movement.created_at).toLocaleDateString('ar-EG')}</span>
                    <span>{money(movement.amount, row.currency)}</span>
                    <span>{movement.invoice?.invoice_number || movement.order?.reference_number || movement.treasury?.account_name || 'تسوية'}</span>
                    {movement.reference && <span>{movement.reference}</span>}
                  </li>
                ))}
              </ul>
            </details>}
            {canManage && orgId && row.partyId && ['approved', 'confirmed'].includes(row.status) && remainingRefundBalance(row) > 0
              && <Button size="sm" onClick={() => setDialog({ orgId, balance: row })}>تسوية الرصيد</Button>}
            {canManage && kind === 'supplier' && row.status === 'pending' && <div className="flex gap-2">
              <Button size="sm" disabled={claim.isPending} onClick={() => claim.mutate({ id: row.id, action: 'confirm' })}>تأكيد رصيد المورد</Button>
              <Button size="sm" variant="outline" disabled={claim.isPending} onClick={() => claim.mutate({ id: row.id, action: 'reject' })}>رفض المطالبة</Button>
            </div>}
          </CardContent>
        </Card>
      ))}
      {dialog && dialog.orgId === orgId && <RefundForm key={dialog.balance?.id ?? orgId} balance={dialog.balance} onClose={() => setDialog(undefined)} />}
    </div>
  );
}
