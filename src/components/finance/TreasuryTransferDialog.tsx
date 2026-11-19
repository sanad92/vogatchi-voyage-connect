import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeftRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { formatMoney } from '@/lib/customerMetrics';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import type { Database } from '@/integrations/supabase/types';

export type TreasuryAccount = Pick<
  Database['public']['Tables']['bank_accounts']['Row'],
  'id' | 'account_name' | 'treasury_kind' | 'currency' | 'current_balance'
>;

export type TreasuryTransfer = {
  id: string;
  from_account_name: string;
  to_account_name: string;
  amount: number;
  currency: string;
  transfer_date: string;
  receipt_reference: string | null;
  reference_number: string;
  journal_entry_id: string;
};

const transferErrors: Record<string, string> = {
  treasury_transfer_permission: 'صلاحية التحويل الداخلي غير متاحة لحسابك.',
  treasury_transfer_read_only: 'المؤسسة في وضع القراءة فقط.',
  treasury_transfer_invalid_details: 'راجع المبلغ وتاريخ التحويل والبيانات المدخلة.',
  treasury_transfer_request_conflict: 'تم تسجيل تحويل بنفس الطلب. راجع سجل التحويلات.',
  treasury_transfer_invalid_accounts: 'اختر حسابين نشطين من البنك أو الخزينة.',
  treasury_transfer_currency: 'اختر حسابين بنفس العملة.',
  treasury_transfer_funds: 'الرصيد المتاح في حساب المصدر غير كافٍ.',
  treasury_transfer_account_routing: 'راجع ربط حسابات البنك والخزينة بدليل الحسابات.',
};

function emptyForm() {
  return { from: '', to: '', amount: '', date: format(new Date(), 'yyyy-MM-dd'), receipt: '' };
}

export default function TreasuryTransferDialog({ accounts, orgId }: { accounts: TreasuryAccount[]; orgId: string }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [requestId, setRequestId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const eligible = accounts.filter(account =>
    (account.treasury_kind === 'cash' || (account.treasury_kind ?? 'bank') === 'bank') &&
    /^[A-Z]{3}$/.test(account.currency ?? ''),
  );
  const sources = eligible.filter(account =>
    eligible.some(other => other.id !== account.id && other.currency === account.currency),
  );
  const from = sources.find(account => account.id === form.from);
  const destinations = from
    ? eligible.filter(account => account.id !== from.id && account.currency === from.currency)
    : [];
  const to = destinations.find(account => account.id === form.to);
  const amount = Number(form.amount);
  const amountValid = /^(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(form.amount) && amount > 0 && amount <= 9_999_999_999.99;

  const post = useMutation({
    mutationFn: async () => {
      const { data, error } = await callUntypedRpc<TreasuryTransfer[]>('post_company_treasury_transfer', {
        _org: orgId,
        _request: requestId,
        _from_account: form.from,
        _to_account: form.to,
        _amount: amount,
        _date: form.date,
        _receipt_reference: form.receipt.trim() || null,
      });
      if (error) throw error;
      if (!data?.[0]) throw new Error('empty_transfer_response');
      return data[0];
    },
    onSuccess: (transfer) => {
      setOpen(false);
      toast({ title: 'تم تسجيل التحويل', description: transfer.reference_number });
      const queryKeys = [
        'treasury-transfers', 'treasury-accounts', 'bank-accounts', 'bank-transactions', 'journal-entries',
        'general-ledger-v2', 'trial-balance', 'trial-balance-v2', 'balance-sheet', 'balance-sheet-v2',
        'cash-flow', 'cash-flow-v2', 'cash-flow-details-v2',
      ];
      void Promise.all(queryKeys.map(key => queryClient.invalidateQueries({ queryKey: [key, orgId] })));
    },
    onError: (error: { message?: string }) => {
      setErrorMessage(transferErrors[error.message ?? ''] ?? 'تعذّر تأكيد تسجيل التحويل. أعد المحاولة أو راجع سجل التحويلات.');
      void queryClient.invalidateQueries({ queryKey: ['treasury-transfers', orgId] });
    },
  });

  function changeOpen(nextOpen: boolean) {
    if (post.isPending) return;
    if (nextOpen) {
      setForm(emptyForm());
      setRequestId(crypto.randomUUID());
      setErrorMessage('');
    }
    setOpen(nextOpen);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (post.isPending || !requestId || !from || !to || !form.date || !amountValid) return;
    setErrorMessage('');
    post.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button><ArrowLeftRight className="me-2 h-4 w-4" />تحويل داخلي</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>تحويل داخلي</DialogTitle>
          <DialogDescription>سجّل التحويل بين حسابين بنفس العملة. تُسجّل الحركتان بقيد محاسبي واحد.</DialogDescription>
        </DialogHeader>
        {sources.length === 0 ? (
          <p className="text-sm text-muted-foreground">التحويل يتطلب حسابين نشطين بنفس العملة في البنك أو الخزينة.</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <fieldset disabled={post.isPending} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="treasury-from">من حساب</Label>
                <Select value={form.from} onValueChange={value => setForm({ ...form, from: value, to: '' })} disabled={post.isPending}>
                  <SelectTrigger id="treasury-from"><SelectValue placeholder="اختر حساب المصدر" /></SelectTrigger>
                  <SelectContent>
                    {sources.map(account => <SelectItem key={account.id} value={account.id}>{account.account_name} · {account.currency}</SelectItem>)}
                  </SelectContent>
                </Select>
                {from && <p className="text-xs text-muted-foreground">الرصيد المتاح <bdi>{formatMoney(from.current_balance ?? 0, from.currency ?? undefined)}</bdi></p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="treasury-to">إلى حساب</Label>
                <Select value={form.to} onValueChange={value => setForm({ ...form, to: value })} disabled={!from || post.isPending}>
                  <SelectTrigger id="treasury-to"><SelectValue placeholder="اختر حساب الوجهة" /></SelectTrigger>
                  <SelectContent>
                    {destinations.map(account => <SelectItem key={account.id} value={account.id}>{account.account_name} · {account.currency}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="treasury-amount">المبلغ</Label>
                <div className="flex items-center gap-2">
                  <Input id="treasury-amount" dir="ltr" type="number" min="0.01" max="9999999999.99" step="0.01"
                    value={form.amount} onChange={event => setForm({ ...form, amount: event.target.value })} required />
                  {from && <span className="text-sm text-muted-foreground">{from.currency}</span>}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="treasury-date">تاريخ التحويل</Label>
                <Input id="treasury-date" type="date" dir="ltr" value={form.date}
                  onChange={event => setForm({ ...form, date: event.target.value })} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="treasury-receipt">رقم إيصال البنك (اختياري)</Label>
                <Input id="treasury-receipt" maxLength={120} value={form.receipt}
                  onChange={event => setForm({ ...form, receipt: event.target.value })} />
              </div>
            </fieldset>
            {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={post.isPending} onClick={() => changeOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={post.isPending || !from || !to || !amountValid || !form.date}>
                {post.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                تسجيل التحويل
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
