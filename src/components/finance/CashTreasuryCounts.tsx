import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from '@/hooks/use-toast';
import { formatMoney } from '@/lib/customerMetrics';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { ListLoadError } from '@/components/common/ListLoadError';
import type { TreasuryAccount } from './TreasuryTransferDialog';

type CashCount = {
  id: string;
  account_name: string;
  currency: string;
  book_amount: number;
  counted_amount: number;
  difference: number;
  counted_at: string;
  notes: string | null;
};

const messages: Record<string, string> = {
  cash_count_permission: 'صلاحية تسجيل جرد الخزنة غير متاحة لحسابك.',
  cash_count_invalid: 'راجع مبلغ الجرد والملاحظات.',
  cash_count_request_conflict: 'تم تسجيل جرد بهذا الطلب. راجع سجل الجرد.',
  cash_count_read_only: 'المؤسسة في وضع القراءة فقط.',
  cash_count_account: 'اختر خزنة نقدية نشطة بعملة محددة.',
};

export function CashTreasuryCounts({ orgId, accounts, canRecord }: { orgId: string; accounts: TreasuryAccount[]; canRecord: boolean }) {
  const queryClient = useQueryClient();
  const { language } = useLanguage();
  const dateFormat = new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en', { dateStyle: 'medium', timeStyle: 'short' });
  const [open, setOpen] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const cashAccounts = accounts.filter(account => account.treasury_kind === 'cash' && /^[A-Z]{3}$/.test(account.currency ?? ''));
  const selected = cashAccounts.find(account => account.id === accountId);
  const countValid = /^(\d+(\.\d{1,2})?|\.\d{1,2})$/.test(amount) && Number(amount) <= 9_999_999_999.99;
  const queryKey = ['cash-treasury-counts', orgId];
  const counts = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<CashCount[]>('list_cash_treasury_counts', { _org: orgId });
      if (error) throw error;
      return data ?? [];
    },
  });

  const record = useMutation({
    mutationFn: async () => {
      const { data, error } = await callUntypedRpc<CashCount[]>('record_cash_treasury_count', {
        _org: orgId, _request: requestId, _account: accountId, _amount: Number(amount), _notes: notes.trim() || null,
      });
      if (error) throw new Error(messages[error.message] ?? 'تعذّر تأكيد تسجيل الجرد. أعد المحاولة أو راجع سجل الجرد.');
      if (!data?.[0]) throw new Error('تعذّر تأكيد تسجيل الجرد. أعد المحاولة أو راجع سجل الجرد.');
      return data[0];
    },
    onSuccess: result => {
      setOpen(false);
      void queryClient.invalidateQueries({ queryKey });
      toast({
        title: 'تم تسجيل جرد الخزنة',
        description: Number(result.difference) === 0 ? 'الجرد مطابق للرصيد المسجّل.' : 'تم تسجيل الفرق للمراجعة.',
      });
    },
    onError: error => {
      setErrorMessage(error.message);
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  function changeOpen(nextOpen: boolean) {
    if (record.isPending) return;
    if (nextOpen) {
      setRequestId(crypto.randomUUID());
      setAccountId(cashAccounts.length === 1 ? cashAccounts[0].id : '');
      setAmount('');
      setNotes('');
      setErrorMessage('');
    }
    setOpen(nextOpen);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (record.isPending || !canRecord || !countValid || !selected || !requestId) return;
    setErrorMessage('');
    record.mutate();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardCheck className="h-4 w-4" /> جرد الخزنة
        </CardTitle>
        {canRecord && cashAccounts.length > 0 && (
          <Dialog open={open} onOpenChange={changeOpen}>
            <DialogTrigger asChild><Button size="sm" variant="outline">تسجيل جرد</Button></DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>تسجيل جرد الخزنة</DialogTitle>
                <DialogDescription>أدخل مبلغ النقد الفعلي عند العدّ. يُحفظ فرق الجرد للمراجعة.</DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={submit}>
                <div className="space-y-1.5">
                  <Label htmlFor="cash-count-account">الخزنة النقدية</Label>
                  <Select value={accountId} onValueChange={value => { setAccountId(value); setAmount(''); }} disabled={record.isPending}>
                    <SelectTrigger id="cash-count-account"><SelectValue placeholder="اختر الخزنة النقدية" /></SelectTrigger>
                    <SelectContent>
                      {cashAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>{account.account_name} · {account.currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selected && <p className="text-xs text-muted-foreground">الرصيد المسجّل الآن <bdi>{formatMoney(selected.current_balance ?? 0, selected.currency ?? undefined)}</bdi></p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cash-count-amount">النقد الفعلي</Label>
                  <Input id="cash-count-amount" dir="ltr" type="number" min="0" max="9999999999.99" step="0.01" required
                    value={amount} onChange={event => setAmount(event.target.value)} disabled={record.isPending} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cash-count-notes">ملاحظات</Label>
                  <Textarea id="cash-count-notes" maxLength={500} value={notes}
                    onChange={event => setNotes(event.target.value)} disabled={record.isPending} />
                </div>
                {errorMessage && <p role="alert" className="text-sm text-destructive">{errorMessage}</p>}
                <DialogFooter>
                  <Button type="button" variant="outline" disabled={record.isPending} onClick={() => changeOpen(false)}>إلغاء</Button>
                  <Button type="submit" disabled={record.isPending || !selected || !countValid}>
                    {record.isPending ? 'جارٍ الحفظ…' : 'حفظ الجرد'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {counts.isLoading ? (
          <p className="py-6 text-center text-muted-foreground">جارٍ التحميل…</p>
        ) : counts.isError ? (
          <ListLoadError message="تعذّر تحميل سجل الجرد" retry={() => void counts.refetch()} pending={counts.isFetching} />
        ) : !counts.data?.length ? (
          <p className="py-6 text-center text-muted-foreground">
            {cashAccounts.length ? 'لا توجد عمليات جرد مسجلة' : 'أضف خزنة نقدية لبدء الجرد.'}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>وقت الجرد</TableHead>
                <TableHead>الخزنة النقدية</TableHead>
                <TableHead className="text-end">الرصيد المسجّل</TableHead>
                <TableHead className="text-end">النقد الفعلي</TableHead>
                <TableHead className="text-end">الفرق</TableHead>
                <TableHead>ملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {counts.data.map(count => {
                const difference = Number(count.difference);
                return (
                  <TableRow key={count.id}>
                    <TableCell className="whitespace-nowrap"><bdi>{dateFormat.format(new Date(count.counted_at))}</bdi></TableCell>
                    <TableCell>{count.account_name}</TableCell>
                    <TableCell className="whitespace-nowrap text-end"><bdi>{formatMoney(count.book_amount, count.currency)}</bdi></TableCell>
                    <TableCell className="whitespace-nowrap text-end"><bdi>{formatMoney(count.counted_amount, count.currency)}</bdi></TableCell>
                    <TableCell className="whitespace-nowrap text-end">
                      <Badge variant={difference < 0 ? 'destructive' : 'outline'}>
                        {difference === 0 ? 'مطابق' : (
                          <span className="flex gap-1">{difference > 0 ? 'زيادة' : 'عجز'} <bdi>{formatMoney(Math.abs(difference), count.currency)}</bdi></span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs break-words">{count.notes || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
