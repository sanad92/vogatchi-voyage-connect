import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useTreasuryAccounts } from '@/hooks/finance/useFinanceRpcs';
import { canSettleRefund, remainingRefundBalance, useRefundBalanceActions, type RefundBalance } from '@/hooks/finance/useRefundBalances';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatRefundAmount as money } from './RefundMovements';

export function RefundForm({ balance, onClose }: { balance?: RefundBalance; onClose: () => void }) {
  const orgId = useOrgId();
  const [method, setMethod] = useState<'treasury' | 'document'>('treasury');
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState(() => balance ? remainingRefundBalance(balance).toFixed(2) : '');
  const [reference, setReference] = useState('');
  const [search, setSearch] = useState('');
  const request = useRef<{ payload: string; id: string }>();
  const submitting = useRef(false);
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
    && (!balance || (canSettleRefund(balance) && numericAmount <= remainingRefundBalance(balance))) && (!needsReference || !!reference.trim());

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit || submitting.current) return;
    submitting.current = true;
    const payload = JSON.stringify([target, numericAmount, method, reference.trim()]);
    if (request.current?.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
    const id = request.current.id;
    const callbacks = { onSuccess: onClose, onSettled: () => { submitting.current = false; } };
    if (!balance) {
      claim.mutate({ id, action: 'create', invoiceId: target, amount: numericAmount, reference }, callbacks);
    } else {
      settle.mutate({
        id, amount: numericAmount, reference, kind: balance.kind,
        sourceId: balance.id, destination: method, targetId: target,
      }, callbacks);
    }
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !pending) onClose(); }}>
      <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto" {...(balance ? {} : { 'aria-describedby': undefined })}>
        <DialogHeader>
          <DialogTitle>{sourceInvoice ? 'مطالبة استرداد من مورد' : 'تسوية رصيد الاسترداد'}</DialogTitle>
          {balance && <DialogDescription>الرصيد المتبقي {money(remainingRefundBalance(balance), balance.currency)}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {balance && (
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
          )}
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

