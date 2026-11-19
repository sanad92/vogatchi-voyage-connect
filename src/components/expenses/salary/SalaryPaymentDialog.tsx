import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatMoney } from '@/lib/customerMetrics';
import type { MonthlySalary } from '@/types/expenses';

type PaymentMethod = 'cash' | 'bank_transfer';
interface Props {
  salary: Pick<MonthlySalary, 'id' | 'net_salary' | 'currency' | 'salary_month'>;
  employeeName?: string;
  busy: boolean;
  onClose: () => void;
  onSave: (payment: {
    salary_id: string;
    status: 'paid';
    payment_date: string;
    payment_method: PaymentMethod;
    bank_account_id?: string;
  }) => Promise<unknown>;
}

export default function SalaryPaymentDialog({ salary, employeeName, busy, onClose, onSave }: Props) {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const currency = salary.currency || 'EGP';
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [method, setMethod] = useState<PaymentMethod | ''>('');
  const [accountId, setAccountId] = useState('');
  const transfer = method === 'bank_transfer';

  const accounts = useQuery({
    queryKey: ['salary-payment-accounts', orgId, user?.id, currency],
    enabled: Boolean(transfer && orgId && user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from('bank_accounts').select('id, account_name, currency')
        .eq('organization_id', orgId!).eq('is_active', true).eq('treasury_kind', 'bank').order('account_name');
      if (error) throw error;
      return data.filter(account => (account.currency || 'EGP') === currency);
    },
  });
  const validAccount = accounts.data?.some(account => account.id === accountId);
  const valid = Boolean(orgId && date && method && (!transfer || (validAccount && !accounts.isError)));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || !method || busy) return;
    try {
      await onSave({
        salary_id: salary.id, status: 'paid', payment_date: date,
        payment_method: method, bank_account_id: transfer ? accountId : undefined,
      });
      onClose();
    } catch {
      // The mutation displays the server error. Keep the form available for correction.
    }
  }

  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent dir="rtl">
      <DialogHeader className="text-start">
        <DialogTitle>تسجيل صرف الراتب</DialogTitle>
        <DialogDescription>{employeeName || 'راتب الموظف'} · {salary.salary_month.slice(0, 7)}</DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-3">
          <span className="text-sm text-muted-foreground">صافي المبلغ</span>
          <strong>{formatMoney(salary.net_salary, currency)}</strong>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="salary-payment-date">تاريخ الصرف</Label>
            <Input id="salary-payment-date" type="date" value={date} onChange={e => setDate(e.target.value)} required disabled={busy} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="salary-payment-method">طريقة الدفع</Label>
            <Select value={method} onValueChange={(value: PaymentMethod) => { setMethod(value); setAccountId(''); }} disabled={busy}>
              <SelectTrigger id="salary-payment-method"><SelectValue placeholder="اختر طريقة الدفع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">نقدي</SelectItem>
                <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {transfer && <div className="space-y-1.5">
          <Label htmlFor="salary-payment-account">حساب الخزينة</Label>
          <Select value={accountId} onValueChange={setAccountId} disabled={busy || !accounts.data?.length || accounts.isError}>
            <SelectTrigger id="salary-payment-account"><SelectValue placeholder="اختر الحساب" /></SelectTrigger>
            <SelectContent>{accounts.data?.map(account =>
              <SelectItem key={account.id} value={account.id}>{account.account_name} · {currency}</SelectItem>)}</SelectContent>
          </Select>
          {accounts.isLoading && <p role="status" className="text-sm text-muted-foreground">جارٍ تحميل الحسابات…</p>}
          {accounts.isError && <div role="alert" className="flex items-center gap-2 text-sm text-destructive">
            تعذّر تحميل الحسابات
            <Button type="button" size="sm" variant="outline" onClick={() => void accounts.refetch()}>إعادة المحاولة</Button>
          </div>}
          {accounts.isSuccess && !accounts.data.length && <p className="text-sm text-muted-foreground">
            لا توجد حسابات نشطة بعملة {currency}.
          </p>}
        </div>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={!valid || busy}>{busy ? 'جارٍ تسجيل الصرف…' : 'تأكيد تسجيل الصرف'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
