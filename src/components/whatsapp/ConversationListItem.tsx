import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, FileText, Mic, Video, ArrowUpRight, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { isClosedConversation } from '@/lib/whatsappQueue';
import { ResolutionBadge } from './CloseConversationDialog';

const WINDOW_MS = 24 * 60 * 60 * 1000;

const initialsOf = (name?: string | null, phone?: string | null) => {
  const source = (name || '').trim();
  if (source) {
    const parts = source.split(/\s+/).slice(0, 2);
    return parts.map(p => p[0]).join('');
  }
  return (phone || '').slice(-2) || '?';
};

const previewIcon = (type?: string | null) => {
  switch (type) {
    case 'image': return ImageIcon;
    case 'audio': return Mic;
    case 'video': return Video;
    case 'document': return FileText;
    default: return null;
  }
};

const previewText = (message: any): string => {
  if (!message) return 'لا توجد رسائل بعد';
  if (message.content) return message.content;
  if (message.template_name) return `قالب: ${message.template_name}`;
  switch (message.message_type) {
    case 'image': return 'صورة';
    case 'audio': return 'رسالة صوتية';
    case 'video': return 'فيديو';
    case 'document': return 'ملف';
    default: return 'رسالة';
  }
};

interface Props {
  conversation: any;
  active: boolean;
  onSelect: () => void;
}

export const ConversationListItem: React.FC<Props> = ({ conversation: c, active, onSelect }) => {
  const closed = isClosedConversation(c);
  const windowOpen = !!c.last_inbound_at && Date.now() - new Date(c.last_inbound_at).getTime() < WINDOW_MS;
  const last = c.last_message;
  const needsReply = last?.direction === 'inbound';
  const PreviewIcon = previewIcon(last?.message_type);

  return (
    <button
      onClick={onSelect}
      aria-current={active}
      className={`w-full text-right px-3 py-2.5 rounded-xl border transition-all duration-200 ${
        active
          ? 'bg-primary/10 border-primary/40 shadow-[var(--shadow-sm)]'
          : 'bg-transparent border-transparent hover:bg-accent/40'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="h-10 w-10 rounded-full bg-[image:var(--gradient-brand)] text-primary-foreground flex items-center justify-center text-xs font-semibold uppercase">
            {initialsOf(c.customer?.name, c.phone_number)}
          </div>
          <span
            aria-hidden
            className={`absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full border-2 border-card ${
              windowOpen ? 'bg-success' : 'bg-muted-foreground/50'
            }`}
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate flex-1" dir={c.customer?.name ? 'rtl' : 'ltr'}>
              {c.customer?.name || c.phone_number}
            </span>

            <span className="text-[10px] text-muted-foreground shrink-0">
              {c.last_message_at && formatDistanceToNow(new Date(c.last_message_at), { addSuffix: true, locale: ar })}
            </span>
          </div>

          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
            {last?.direction === 'outbound' && <ArrowUpRight className="h-3 w-3 shrink-0" />}
            {PreviewIcon && <PreviewIcon className="h-3 w-3 shrink-0" />}
            <span className="truncate">{previewText(last)}</span>
            {needsReply && !closed && (
              <span className="ms-auto shrink-0 h-2 w-2 rounded-full bg-success" aria-label="بانتظار الرد" />
            )}
          </div>

          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
            {c.inbox && (
              <Badge variant="secondary" className="text-[10px] py-0 h-[18px] font-normal">
                {c.inbox.label || c.inbox.display_phone_number || c.inbox.business_name || 'واتساب'}
              </Badge>
            )}
            {c.customer?.name && (
              <Badge variant="outline" className="text-[10px] py-0 h-[18px] font-normal text-muted-foreground">
                {c.phone_number}
              </Badge>
            )}
            {closed && <ResolutionBadge status={c.resolution_status} className="text-[10px] py-0 h-[18px]" />}
            {c.sla_breached_first_response && (
              <Badge variant="destructive" className="text-[10px] py-0 h-[18px] gap-1">
                <Clock className="h-2.5 w-2.5" /> تجاوز المدة
              </Badge>
            )}
            {c.priority === 'urgent' && (
              <Badge variant="destructive" className="text-[10px] py-0 h-[18px]">عاجل</Badge>
            )}
          </div>

          {closed && c.resolution_notes && (
            <p className="mt-1 text-[10px] text-muted-foreground truncate" title={c.resolution_notes}>
              {c.resolution_notes}
            </p>
          )}
        </div>
      </div>
    </button>
  );
};
