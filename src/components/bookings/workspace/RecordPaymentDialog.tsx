import { useState } from 'react';
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

const anyClient = supabase as any;

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
  trigger?: React.ReactNode;
}

export const RecordPaymentDialog = ({
  bookingId,
  customerId,
  currency = 'EGP',
  outstanding = 0,
  invoices = [],
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

  const reset = () => {
    setAmount(outstanding > 0 ? String(outstanding) : '');
    setMethod('cash');
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setReference('');
    setInvoiceId('none');
    setAccountId('none');
    setNotes('');
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('لا توجد منظمة نشطة');
      const value = Number(amount);
      if (!value || value <= 0) throw new Error('أدخل مبلغًا صحيحًا أكبر من صفر');

      const { error } = await anyClient.from('customer_payments').insert({
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
      queryClient.invalidateQueries({ queryKey: ['booking-financial-summary'] });
      onSaved?.();
      reset();
      setOpen(false);
    },
    onError: (e: any) =>
      toast({ title: 'تعذر تسجيل الدفعة', description: e.message, variant: 'destructive' }),
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
              <Select value={invoiceId} onValueChange={setInvoiceId}>
                <SelectTrigger><SelectValue placeholder="بدون" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون</SelectItem>
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
                  {bankAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.account_name} ({a.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

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
