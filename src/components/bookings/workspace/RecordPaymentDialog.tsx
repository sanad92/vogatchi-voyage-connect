import { useRef, useState } from 'react';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useToast } from '@/hooks/use-toast';
import { useBankAccounts } from '@/hooks/useBankAccounts';
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
  invoices?: Array<{ id: string; invoice_number?: string | null; total_amount?: number | null }>;
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
  const { bankAccounts } = useBankAccounts();

  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(outstanding > 0 ? String(outstanding) : '');
  const [method, setMethod] = useState('cash');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [reference, setReference] = useState('');
  const [invoiceId, setInvoiceId] = useState<string>('none');
  const [accountId, setAccountId] = useState<string>('none');
  const [notes, setNotes] = useState('');
  const [exchangeRate, setExchangeRate] = useState('');
  const request = useRef<{ payload: string; id: string } | null>(null);

  const reset = () => {
    setAmount(outstanding > 0 ? String(outstanding) : '');
    setMethod('cash');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setReference('');
    setInvoiceId('none');
    setAccountId('none');
    setNotes('');
    setExchangeRate('');
    request.current = null;
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('لا توجد منظمة نشطة');
      const value = Number(amount);
      if (!value || value <= 0) throw new Error('أدخل مبلغًا صحيحًا أكبر من صفر');

      if (fixedInvoiceId) {
        const rate = currency === 'EGP' ? 1 : Number(exchangeRate);
        if (!Number.isFinite(rate) || rate <= 0) throw new Error('أدخل سعر الصرف قبل تسجيل الدفعة');
        const payload = {
          _invoice_id: fixedInvoiceId, _amount: value, _currency: currency, _exchange_rate: rate,
          _method: method, _treasury_account_id: accountId === 'none' ? null : accountId,
          _payment_date: paymentDate, _reference: reference || null, _notes: notes || null,
          _booking_id: bookingId, _customer_id: customerId ?? null,
        };
        const fingerprint = JSON.stringify(payload);
        if (request.current?.payload !== fingerprint) request.current = { payload: fingerprint, id: crypto.randomUUID() };
        const { data, error } = await callUntypedRpc<string>('record_customer_payment', { ...payload, _client_ref: request.current.id });
        if (error) throw new Error(error.message);
        if (!data) throw new Error('تعذر تأكيد تسجيل الدفعة');
        return;
      }
      const { error } = await supabase.from('customer_payments').insert({
        organization_id: orgId,
        booking_id: bookingId,
        customer_id: customerId ?? null,
        invoice_id: invoiceId === 'none' ? null : invoiceId,
        treasury_account_id: accountId === 'none' ? null : accountId,
        amount: value,
        currency,
        exchange_rate: 1,
        amount_base: value,
        payment_method: method,
        payment_date: paymentDate,
        reference_number: reference || null,
        notes: notes || null,
        status: 'completed',
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'تم تسجيل الدفعة بنجاح' });
      queryClient.invalidateQueries({ queryKey: ['workspace-payments'] });
      if (fixedInvoiceId) {
        void queryClient.invalidateQueries({ queryKey: ['workspace-invoices', bookingId] });
        void queryClient.invalidateQueries({ queryKey: ['unified-bookings'] });
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
    <Dialog open={open} onOpenChange={setOpen}>
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
              <Select value={method} onValueChange={setMethod}>
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
              <Label>مرتبطة بفاتورة</Label>
              <Select value={fixedInvoiceId ?? invoiceId} onValueChange={setInvoiceId} disabled={!!fixedInvoiceId}>
                <SelectTrigger><SelectValue placeholder="بدون" /></SelectTrigger>
                <SelectContent>
                  {!fixedInvoiceId && <SelectItem value="none">بدون</SelectItem>}
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.invoice_number || inv.id.slice(0, 8)} — {Number(inv.total_amount ?? 0).toLocaleString()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>حساب الاستلام</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger><SelectValue placeholder="بدون" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون</SelectItem>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.account_name} ({a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {fixedInvoiceId && currency !== 'EGP' && <div className="space-y-2">
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
          <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? 'جارٍ الحفظ...' : 'حفظ الدفعة'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecordPaymentDialog;
