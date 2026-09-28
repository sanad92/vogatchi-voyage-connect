import { useQuery } from '@tanstack/react-query';
import { Archive, Bot, BotOff, PauseCircle, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { botMayReply } from '../../../supabase/functions/_shared/whatsapp-bot-policy';

type Conversation = Parameters<typeof botMayReply>[0] & {
  id?: string;
  assigned_to?: string | null;
};

const CLOSED_STATUSES = ['closed', 'resolved', 'archived'];

const tone: Record<string, string> = {
  bot: 'bg-success/10 text-success border-success/30',
  human: 'bg-primary/10 text-primary border-primary/30',
  waiting: 'bg-warning/15 text-warning-foreground/90 border-warning/40 dark:text-warning',
  disabled: 'bg-muted text-muted-foreground border-border',
  closed: 'bg-muted text-muted-foreground border-border',
};

interface Props {
  conversation: Conversation;
  /** compact: pill for the conversation header row */
  compact?: boolean;
}

/**
 * Shows, at a glance, who is responsible for the next reply in this
 * conversation: the AI bot or a human employee — and why.
 */
export function ConversationAgentIndicator({ conversation, compact }: Props) {
  const organizationId = useOrgId();
  const conversationId = conversation.id;

  const isClosed = CLOSED_STATUSES.includes(conversation.status || '');
  const assignedTo = conversation.assigned_to || null;
  const botAllowed = !isClosed && botMayReply(conversation);

  // Bot availability is an organization-wide setting.
  const { data: botEnabled, isLoading: botLoading } = useQuery({
    queryKey: ['whatsapp-bot-enabled', organizationId],
    enabled: botAllowed && !!organizationId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any).from('whatsapp_chatbot_settings')
        .select('is_enabled').eq('organization_id', organizationId).maybeSingle();
      return data === null ? true : !!data?.is_enabled;
    },
  });

  // Resolve the responsible employee's name for the assigned state.
  const { data: employeeName } = useQuery({
    queryKey: ['whatsapp-assigned-employee-name', conversationId, assignedTo],
    enabled: !!assignedTo,
    staleTime: 60_000,
    queryFn: async () => {
      const { data } = await (supabase as any).from('employees')
        .select('full_name').eq('id', assignedTo).maybeSingle();
      return (data?.full_name as string) || null;
    },
  });

  if (isClosed) {
    return <StatePill tone="closed" icon={<Archive className="h-3.5 w-3.5" aria-hidden="true" />}
      label="محادثة منتهية" detail="لا يرد البوت حتى يرسل العميل رسالة جديدة" compact={compact} />;
  }

  if (assignedTo) {
    return <StatePill tone="human" icon={<UserCheck className="h-3.5 w-3.5" aria-hidden="true" />}
      label={`يتولى الرد: ${employeeName || 'موظف'}`} detail="الموظف المسؤول عن هذه المحادثة" compact={compact} />;
  }

  if (!botAllowed) {
    return <StatePill tone="waiting" icon={<PauseCircle className="h-3.5 w-3.5" aria-hidden="true" />}
      label="بانتظار استلام موظف" detail="الرد الآلي متوقف حتى يستلم موظف المحادثة" compact={compact} />;
  }

  if (botLoading || botEnabled === undefined) {
    return <StatePill tone="disabled" icon={<Bot className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />}
      label="جارٍ التحقق من حالة الرد الآلي…" compact={compact} />;
  }

  if (!botEnabled) {
    return <StatePill tone="disabled" icon={<BotOff className="h-3.5 w-3.5" aria-hidden="true" />}
      label="الرد الآلي معطّل" detail="الموظفون مسؤولون عن الرد على هذه المحادثة" compact={compact} />;
  }

  return <StatePill tone="bot" icon={<Bot className="h-3.5 w-3.5" aria-hidden="true" />}
    label="الرد الآلي نشط" detail="البوت سيرد على رسائل العميل القادمة" compact={compact} />;
};

const StatePill = ({ tone, icon, label, detail, compact }: {
  tone: string;
  icon: React.ReactNode;
  label: string;
  detail?: string;
  compact?: boolean;
}) => (
  <span
    role="status"
    title={detail}
    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none shrink-0 ${tone[tone] ?? tone.disabled}`}
  >
    {icon}
    <span className="truncate">{label}</span>
    {!compact && detail && <span className="hidden lg:inline font-normal opacity-70 truncate">— {detail}</span>}
  </span>
);

export default ConversationAgentIndicator;
