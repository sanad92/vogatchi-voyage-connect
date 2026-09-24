import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  conversations: any[];
  excludeId?: string;
  onPick: (conversationId: string) => void;
}

export const ForwardMessageDialog: React.FC<Props> = ({ open, onOpenChange, conversations, excludeId, onPick }) => {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return conversations.filter(c => c.id !== excludeId &&
      (!s || (c.customer?.name || '').toLowerCase().includes(s) || (c.phone_number || '').includes(s)));
  }, [conversations, excludeId, q]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle>إعادة توجيه الرسالة</DialogTitle>
          <DialogDescription>اختر المحادثة، وستُوضع الرسالة في خانة الكتابة لتراجعها قبل الإرسال.</DialogDescription>
        </DialogHeader>
        <Input placeholder="ابحث بالاسم أو الرقم" value={q} onChange={e => setQ(e.target.value)} />
        <ScrollArea className="h-72">
          <div className="space-y-1">
            {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">لا توجد محادثات</p>}
            {list.map(c => (
              <button key={c.id} type="button" onClick={() => onPick(c.id)}
                className="w-full text-start rounded-lg px-3 py-2 hover:bg-muted transition-colors">
                <div className="text-sm font-medium">{c.customer?.name || c.phone_number}</div>
                <div className="text-xs text-muted-foreground" dir="ltr">{c.phone_number}</div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
