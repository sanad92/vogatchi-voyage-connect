import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell } from 'lucide-react';
import { usePendingFollowupsForOrg } from '@/hooks/useConversationFollowups';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

export const FollowupsBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { pending, dueNow } = usePendingFollowupsForOrg();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {dueNow.length > 0 && (
            <span className="absolute -top-1 -end-1 h-4 min-w-[16px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {dueNow.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[340px] p-0">
        <div className="p-3 border-b flex items-center justify-between">
          <h4 className="text-sm font-semibold">تذكيرات المتابعة</h4>
          <Badge variant={dueNow.length ? 'destructive' : 'secondary'} className="text-[10px]">
            {dueNow.length} مستحق / {pending.length} إجمالي
          </Badge>
        </div>
        <ScrollArea className="h-[320px]">
          {pending.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground p-6">
              لا توجد تذكيرات نشطة
            </p>
          ) : (
            <div className="divide-y">
              {pending.slice(0, 20).map((f) => {
                const isDue = new Date(f.remind_at) <= new Date();
                return (
                  <Link
                    key={f.id}
                    to={`/whatsapp-inbox/${f.conversation_id}`}
                    onClick={() => setOpen(false)}
                    className="block p-2.5 hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant={isDue ? 'destructive' : 'outline'} className="text-[9px]">
                        {isDue ? 'مستحق' : formatDistanceToNow(new Date(f.remind_at), { locale: ar, addSuffix: true })}
                      </Badge>
                    </div>
                    <p className="text-xs line-clamp-2">{f.note || 'متابعة محادثة'}</p>
                  </Link>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};
