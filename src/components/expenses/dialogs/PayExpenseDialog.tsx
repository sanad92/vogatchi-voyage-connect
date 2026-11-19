import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTreasuryAccounts } from '@/hooks/finance/useFinanceRpcs';
import { useToast } from '@/hooks/use-toast';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { formatMoney } from '@/lib/customerMetrics';

type PayableExpense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  payment_method: string;
  bank_account_id?: string;
};

export function PayExpenseDialog({ expense, onClose }: { expense: PayableExpense; onClose: () => void }) {
  const { data: accounts = [], isLoading, isError } = useTreasuryAccounts();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState(expense.bank_account_id ?? '');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const currency = expense.currency || 'EGP';
  const eligibleAccounts = accounts.filter(account =>
    account.currency === currency && (expense.payment_method === 'cash' ? account.treasury_kind === 'cash' : account.treasury_kind !== 'cash'),
  );
  const account = eligibleAccounts.find(item => item.id === accountId);

  const pay = useMutation({
    mutationFn: async () => {
      if (!account || !date) throw new Error('اختر حساب الصرف وتاريخ السداد.');
      const { data, error } = await callUntypedRpc<string>('pay_operating_expense', {
        _expense: expense.id, _account: account.id, _payment_date: date,
      });
      if (error) throw new Error(error.message === 'Cash treasury has insufficient balance' ? 'رصيد الخزنة غير كافٍ.' : error.message);
      if (data !== expense.id) throw new Error('تعذّر تأكيد صرف المصروف.');
    },
    onSuccess: () => {
      for (const key of ['expense-transactions-optimized', 'treasury-accounts', 'bank-accounts', 'bank-transactions', 'journal-entries']) {
        void queryClient.invalidateQueries({ queryKey: [key] });
      }
      toast({ title: 'تم تسجيل صرف المصروف' });
      onClose();
    },
    onError: (error) => toast({
      title: 'تعذّر صرف المصروف', description: error.message, variant: 'destructive',
    }),
  });

  return (
    <Dialog open onOpenChange={open => { if (!open && !pay.isPending) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>صرف المصروف</DialogTitle>
          <DialogDescription>{expense.description} · <bdi>{formatMoney(expense.amount, currency)}</bdi></DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={event => { event.preventDefault(); if (!pay.isPending) pay.mutate(); }}>
          <div className="space-y-1.5">
            <Label htmlFor="expense-payment-account">حساب الصرف</Label>
            <Select value={account?.id ?? ''} onValueChange={setAccountId} disabled={pay.isPending}>
              <SelectTrigger id="expense-payment-account"><SelectValue placeholder="اختر حساب الصرف" /></SelectTrigger>
              <SelectContent>
                {eligibleAccounts.map(item => <SelectItem key={item.id} value={item.id}>{item.account_name}</SelectItem>)}
              </SelectContent>
            </Select>
            {isError ? <p role="alert" className="text-sm text-destructive">تعذّر تحميل الحسابات</p> :
              !isLoading && eligibleAccounts.length === 0 && <p className="text-sm text-muted-foreground">لا يوجد حساب متاح لعملة المصروف وطريقة الدفع.</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="expense-payment-date">تاريخ الصرف</Label>
            <Input id="expense-payment-date" type="date" dir="ltr" required value={date}
              onChange={event => setDate(event.target.value)} disabled={pay.isPending} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={pay.isPending} onClick={onClose}>إلغاء</Button>
            <Button type="submit" disabled={pay.isPending || !account || !date}>
              {pay.isPending ? 'جارٍ تسجيل الصرف…' : 'تأكيد تسجيل الصرف'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
