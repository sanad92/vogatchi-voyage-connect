import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { User, Phone, Mail, Building2, ListChecks, MessageCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { useWhatsAppWindow } from '@/hooks/useWhatsAppWindow';
import { ProfitWidget } from './ProfitWidget';
import type { Workspace, TabKey } from './types';

interface Props {
  workspace: Workspace;
  onOpenTab: (t: TabKey) => void;
}

export const OverviewTab = ({ workspace, onOpenTab }: Props) => {
  const navigate = useNavigate();
  const nextTask = workspace.tasks.find((t) => t.status !== 'done' && t.status !== 'cancelled');
  const openTasks = workspace.tasks.filter((t) => t.status !== 'done' && t.status !== 'cancelled').length;
  const conversationId = workspace.conversation?.id;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> بطاقة العميل
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <Row label="الاسم" value={workspace.customer?.name || '—'} />
          <Row label="الهاتف" value={workspace.customer?.phone || '—'} icon={<Phone className="h-3 w-3" />} />
          <Row label="البريد" value={workspace.customer?.email || '—'} icon={<Mail className="h-3 w-3" />} />
          <Row
            label="المورد"
            value={workspace.supplier?.name || workspace.booking?.supplier_name || '—'}
            icon={<Building2 className="h-3 w-3" />}
          />
        </CardContent>
      </Card>

      <ProfitWidget workspace={workspace} />

      <Card className="md:col-span-2">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" /> المهام
            {openTasks > 0 && <Badge variant="secondary" className="mr-1">{openTasks}</Badge>}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onOpenTab('tasks')}>عرض الكل</Button>
        </CardHeader>
        <CardContent className="text-sm">
          {nextTask ? (
            <div className="rounded-md border p-3 flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{nextTask.title}</p>
                {nextTask.description && (
                  <p className="text-xs text-muted-foreground mt-1">{nextTask.description}</p>
                )}
                {nextTask.due_at && (
                  <p className="text-xs text-muted-foreground mt-1">
                    مستحقة: {new Date(nextTask.due_at).toLocaleString('ar-EG')}
                  </p>
                )}
              </div>
              <Badge variant="outline">{nextTask.priority}</Badge>
            </div>
          ) : (
            <p className="text-muted-foreground">لا توجد مهام مفتوحة.</p>
          )}
        </CardContent>
      </Card>

      <WhatsAppEmbed
        conversationId={conversationId}
        customerPhone={workspace.customer?.phone}
        onOpen={() => onOpenTab('whatsapp')}
        onOpenFull={() => conversationId && navigate(`/whatsapp-admin?conversation=${conversationId}`)}
      />
    </div>
  );
};

const WhatsAppEmbed = ({
  conversationId,
  customerPhone,
  onOpen,
  onOpenFull,
}: {
  conversationId?: string;
  customerPhone?: string;
  onOpen: () => void;
  onOpenFull: () => void;
}) => {
  const { data: messages } = useWhatsAppMessages(conversationId);
  const window = useWhatsAppWindow(conversationId);
  const recent = (messages ?? []).slice(-3);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-4 w-4" /> واتساب
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onOpen}>فتح</Button>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${window?.isOpen ? 'bg-emerald-500' : 'bg-destructive'}`} />
          <span className="text-xs">
            {window?.isOpen ? 'النافذة مفتوحة — رسائل حرة' : 'النافذة مغلقة — قوالب فقط'}
          </span>
        </div>
        {!conversationId ? (
          <p className="text-xs text-muted-foreground">
            {customerPhone ? `لا توجد محادثة بعد لرقم ${customerPhone}` : 'لا يوجد رقم واتساب للعميل.'}
          </p>
        ) : recent.length === 0 ? (
          <p className="text-xs text-muted-foreground">لا توجد رسائل حديثة.</p>
        ) : (
          <div className="space-y-1.5">
            {recent.map((m: any) => (
              <div
                key={m.id}
                className={`rounded-md border p-2 text-xs ${m.direction === 'inbound' ? 'bg-muted/30' : 'bg-primary/5'}`}
              >
                <p className="line-clamp-2">{m.content || m.media_caption || `[${m.message_type}]`}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {m.direction === 'inbound' ? 'وارد' : 'صادر'} · {new Date(m.sent_at).toLocaleTimeString('ar-EG')}
                </p>
              </div>
            ))}
          </div>
        )}
        {conversationId && (
          <Button variant="outline" size="sm" className="w-full" onClick={onOpenFull}>
            المحادثة الكاملة <ExternalLink className="h-3 w-3 mr-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

const Row = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted-foreground text-xs flex items-center gap-1">
      {icon}
      {label}
    </span>
    <span className="font-medium truncate">{value}</span>
  </div>
);
