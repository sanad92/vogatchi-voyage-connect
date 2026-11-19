import { useRef, useState } from 'react';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/useOrgId';
import { useToast } from '@/hooks/use-toast';
import { useTreasuryAccounts } from '@/hooks/finance/useFinanceRpcs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Wallet } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'cash', label: 'نقدي' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'card', label: 'بطاقة' },
  { value: 'wallet', label: 'محفظة إلكترونية' },
  { value: 'cheque', label: 'شيك' },
  { value: 'other', label: 'أخرى' },
];

interface Props {
  bookingId: string;
  customerId?: string | null;
  currency?: string;
  outstanding?: number;
  invoices?: Array<{ id: string; invoice_number?: string | null; remaining: number }>;
  onSaved?: () => void;
  fixedInvoiceId?: string;
  trigger?: React.ReactNode;
}

export const RecordPaymentDialog = ({
  bookingId,
  customerId,
  currency = 'EGP',
  outstanding = 0,
  invoices = [],
  fixedInvoiceId,
  onSaved,
  trigger,
}: Props) => {
  const orgId = useOrgId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useTreasuryAccounts();

  const [open, setOpen] = useState(false);
  const [enteredAmount, setAmount] = useState<string | null>(null);
  const [method, setMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [notes, setNotes] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const request = useRef<{ payload: string; id: string } | null>(null);
  const receiptAccounts = accounts.filter(account =>
    account.currency === currency && (method === 'cash' ? account.treasury_kind === 'cash' : account.treasury_kind !== 'cash'),
  );
  const selectedAccount = receiptAccounts.find(account => account.id === accountId);

  const selectedInvoice = invoices.find(invoice => invoice.id === (fixedInvoiceId ?? invoiceId));
  const isAdvance = !fixedInvoiceId && invoiceId === 'advance';
  const amount = enteredAmount ?? (selectedInvoice ? String(selectedInvoice.remaining) : '');
  const receiptAmount = Number(amount);
  const allocated = Math.min(selectedInvoice?.remaining ?? 0, receiptAmount);
  const advance = receiptAmount - allocated;

  const reset = () => {
    setAmount(null);
    setMethod('cash');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setReference('');
    setInvoiceId('');
    setAccountId('');
    setNotes('');
    setExchangeRate('');
    request.current = null;
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('لا توجد منظمة نشطة');
      if (!selectedInvoice && !isAdvance) throw new Error('اختر فاتورة أو دفعة مقدمة.');
      const value = Number(amount);
      if (!Number.isFinite(value) || value <= 0) throw new Error('أدخل مبلغًا صحيحًا أكبر من صفر');
      if (!selectedAccount) throw new Error('اختر حساب الاستلام بنفس عملة الدفعة.');
      const rate = currency === 'EGP' ? 1 : Number(exchangeRate);
      if (!Number.isFinite(rate) || rate <= 0) throw new Error('أدخل سعر الصرف قبل تسجيل الدفعة');

      const payload = {
        _invoice_id: selectedInvoice?.id ?? null,
        _amount: value, _currency: currency, _exchange_rate: rate,
        _method: method, _treasury_account_id: selectedAccount.id,
        _payment_date: paymentDate, _reference: reference.trim() || null, _notes: notes.trim() || null,
        _booking_id: bookingId, _customer_id: customerId ?? null,
      };
      const fingerprint = JSON.stringify(payload);
      if (request.current?.payload !== fingerprint) request.current = { payload: fingerprint, id: crypto.randomUUID() };
      const { data, error } = await callUntypedRpc<string>('record_customer_payment', { ...payload, _client_ref: request.current.id });
      if (error) throw new Error(error.message);
      if (!data) throw new Error('تعذر تأكيد تسجيل الدفعة');
    },
    onSuccess: () => {
      toast({ title: 'تم تسجيل الدفعة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['workspace-payments'] });
      void queryClient.invalidateQueries({ queryKey: ['workspace-invoices', bookingId] });
      void queryClient.invalidateQueries({ queryKey: ['unified-bookings'] });
      for (const key of ['treasury-accounts', 'bank-accounts', 'bank-transactions', 'journal-entries']) {
        void queryClient.invalidateQueries({ queryKey: [key, orgId] });
      }
      queryClient.invalidateQueries({ queryKey: ['booking-financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['booking-profit-cockpit', bookingId] });
      onSaved?.();
      reset();
      setOpen(false);
    },
    onError: (error) =>
      toast({ title: 'تعذر تسجيل الدفعة', description: error instanceof Error ? error.message : 'حدث خطأ غير متوقع', variant: 'destructive' }),
  });

  return (
    <Dialog open={open} onOpenChange={nextOpen => { if (!save.isPending) setOpen(nextOpen); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Wallet className="h-4 w-4 ml-1" /> تسجيل دفعة
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>تسجيل دفعة من العميل</DialogTitle>
          <DialogDescription>
            المستحق حاليًا: {outstanding.toLocaleString()} {currency}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pay-amount">المبلغ المدفوع ({currency})</Label>
              <Input
                id="pay-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-date">تاريخ الدفع</Label>
              <Input
                id="pay-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <Select value={method} onValueChange={value => { setMethod(value); setAccountId(''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pay-ref">رقم المرجع / الإيصال</Label>
              <Input
                id="pay-ref"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="اختياري"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>تخصيص الدفعة</Label>
              <Select value={fixedInvoiceId ?? invoiceId} onValueChange={id => { setInvoiceId(id); setAmount(null); }} disabled={!!fixedInvoiceId}>
                <SelectTrigger><SelectValue placeholder="اختر فاتورة أو دفعة مقدمة" /></SelectTrigger>
                <SelectContent>
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number || inv.id.slice(0, 8)} — {inv.remaining.toLocaleString()} {currency}
                    </SelectItem>
                  ))}
                  {!fixedInvoiceId && <SelectItem value="advance">دفعة مقدمة بدون تخصيص لفاتورة</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>حساب الاستلام</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="اختر حساب الاستلام" /></SelectTrigger>
                <SelectContent>
                  {receiptAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.account_name} ({a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {receiptAccounts.length === 0 && <p className="text-xs text-muted-foreground">لا يوجد حساب متاح لعملة الدفعة وطريقة الدفع.</p>}
            </div>
          </div>

          {(selectedInvoice || isAdvance) && Number.isFinite(receiptAmount) && receiptAmount > 0 && (
            <div className="text-sm text-muted-foreground" aria-live="polite">
              <p><span>سداد الفاتورة</span> · {allocated.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</p>
              <p><span>مقدم العميل</span> · {advance.toLocaleString(undefined, { maximumFractionDigits: 2 })} {currency}</p>
            </div>
          )}

          {currency !== 'EGP' && <div className="space-y-2">
            <Label htmlFor="pay-exchange-rate">سعر الصرف إلى الجنيه</Label>
            <Input id="pay-exchange-rate" type="number" min="0.000001" step="0.000001" value={exchangeRate}
              onChange={(event) => setExchangeRate(event.target.value)} />
          </div>}

          <div className="space-y-2">
            <Label htmlFor="pay-notes">ملاحظات</Label>
            <Textarea
              id="pay-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="اختياري"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={save.isPending} onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || (!selectedInvoice && !isAdvance) || !selectedAccount || !paymentDate}>
            {save.isPending ? 'جارٍ الحفظ...' : 'حفظ الدفعة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;
