import React from 'react';
import { MoreVertical, Reply, Copy, Forward, MailOpen, Mail } from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export const messageTextOf = (m: any): string =>
  m?.content || m?.body || (m?.template_name ? `[قالب: ${m.template_name}]` : '') || '';

interface Props {
  message: any;
  outbound: boolean;
  unread: boolean;
  onReply: (m: any) => void;
  onForward: (m: any) => void;
  onToggleRead: (unread: boolean) => void;
}

export const MessageActionsMenu: React.FC<Props> = ({ message, outbound, unread, onReply, onForward, onToggleRead }) => {
  const copy = async () => {
    const text = messageTextOf(message);
    if (!text) return toast.error('لا يوجد نص لنسخه');
    try { await navigator.clipboard.writeText(text); toast.success('تم نسخ الرسالة'); }
    catch { toast.error('تعذر النسخ'); }
  };
  return (
    <DropdownMenu dir="rtl">
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="إجراءات الرسالة"
          className={`opacity-0 group-hover:opacity-100 focus:opacity-100 data-[state=open]:opacity-100 transition-opacity rounded-full p-1 ${outbound ? 'hover:bg-chat-out-foreground/15' : 'hover:bg-muted'}`}>
          <MoreVertical className="h-3.5 w-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onReply(message)}><Reply className="h-4 w-4 me-2" />رد</DropdownMenuItem>
        <DropdownMenuItem onClick={copy}><Copy className="h-4 w-4 me-2" />نسخ</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onForward(message)}><Forward className="h-4 w-4 me-2" />إعادة توجيه</DropdownMenuItem>
        <DropdownMenuSeparator />
        {unread ? (
          <DropdownMenuItem onClick={() => onToggleRead(false)}><MailOpen className="h-4 w-4 me-2" />تحديد كمقروءة</DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => onToggleRead(true)}><Mail className="h-4 w-4 me-2" />تحديد كغير مقروءة</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
