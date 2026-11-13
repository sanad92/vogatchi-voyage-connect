import { useState } from 'react';
import { useRefundBalanceActions, type RefundBalance } from '@/hooks/finance/useRefundBalances';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function RefundFollowUpDialog({ balance, onClose }: { balance: RefundBalance; onClose: () => void }) {
  const [date, setDate] = useState(balance.followUpOn ?? '');
  const { schedule } = useRefundBalanceActions();
  return (
    <Dialog open onOpenChange={open => { if (!open && !schedule.isPending) onClose(); }}>
      <DialogContent dir="rtl" aria-describedby={undefined}>
        <DialogHeader><DialogTitle>تعديل موعد المتابعة</DialogTitle></DialogHeader>
        <form className="space-y-4" onSubmit={event => {
          event.preventDefault();
          if (!schedule.isPending) {
            schedule.mutate({ id: balance.id, kind: balance.kind, date: date || null }, { onSuccess: onClose });
          }
        }}>
          <div className="space-y-2">
            <Label htmlFor="refund-follow-up-date">موعد المتابعة</Label>
            <Input id="refund-follow-up-date" type="date" min="0001-01-01" max="9999-12-31"
              value={date} onChange={event => setDate(event.target.value)} disabled={schedule.isPending} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={schedule.isPending || date === (balance.followUpOn ?? '')}>حفظ الموعد</Button>
            {date && <Button type="button" variant="outline" disabled={schedule.isPending} onClick={() => setDate('')}>مسح الموعد</Button>}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
