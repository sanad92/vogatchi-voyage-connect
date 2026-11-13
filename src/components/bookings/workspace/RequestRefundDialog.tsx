import { useState } from 'react';
import { useRefundActions } from '@/hooks/finance/useFinanceRpcs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function RequestRefundDialog({ bookingId, currency }: { bookingId: string; currency: string }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('');
  const [reason, setReason] = useState('');
  const { create } = useRefundActions();
  const foreignCurrency = currency !== 'EGP';

  return (
    <Dialog open={open} onOpenChange={value => { if (!create.isPending) setOpen(value); }}>
      <DialogTrigger asChild><Button size="sm" variant="outline">طلب استرداد</Button></DialogTrigger>
      <DialogContent dir="rtl">
        <DialogHeader><DialogTitle>طلب استرداد للعميل</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault();
          if (create.isPending || !reason.trim() || !(Number(amount) > 0) || (foreignCurrency && !(Number(rate) > 0))) return;
          create.mutate({ booking_id: bookingId, amount: Number(amount), currency,
            exchange_rate: foreignCurrency ? Number(rate) : 1, reason: reason.trim() }, {
            onSuccess: () => { setOpen(false); setAmount(''); setRate(''); setReason(''); },
          });
        }}>
          <div className="space-y-2">
            <Label htmlFor="booking-refund-amount">المبلغ ({currency})</Label>
            <Input id="booking-refund-amount" required type="number" min="0.01" step="0.01" value={amount} onChange={event => setAmount(event.target.value)} />
          </div>
          {foreignCurrency && <div className="space-y-2">
            <Label htmlFor="booking-refund-rate">سعر الصرف إلى EGP</Label>
            <Input id="booking-refund-rate" required type="number" min="0.000001" step="0.000001" value={rate} onChange={event => setRate(event.target.value)} />
          </div>}
          <div className="space-y-2">
            <Label htmlFor="booking-refund-reason">سبب الاسترداد</Label>
            <Input id="booking-refund-reason" required maxLength={500} value={reason} onChange={event => setReason(event.target.value)} />
          </div>
          <Button disabled={create.isPending} type="submit">إرسال للاعتماد</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
