import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Inbox, Clock, ArrowLeft, CheckCircle2, Send } from 'lucide-react';
import { useAcceptHandover, useAcknowledgeAssignment, useHandoverInbox, useMyPendingAssignments } from '@/hooks/useSop';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { DEPARTMENT_LABELS, HANDOVER_FLOW, HANDOVER_LABELS } from '@/lib/sop';

const timeAgo = (iso?: string | null) => {
  if (!iso) return '';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return `منذ ${Math.round(hrs / 24)} يوم`;
};

interface Props {
  onOpenLead?: (leadId: string) => void;
}

/** One screen for everything waiting to be received or accepted. */
export const HandoverInbox = ({ onOpenLead }: Props) => {
  const { data: inbox } = useHandoverInbox();
  const { data: pendingAssignments } = useMyPendingAssignments();
  const { members } = useOrgMembers();
  const accept = useAcceptHandover();
  const ack = useAcknowledgeAssignment();

  const nameOf = (id?: string | null) => {
    if (!id) return 'غير محدد';
    const m = members.find((x) => x.user_id === id);
    return m?.profile?.full_name || m?.profile?.email || id.slice(0, 8);
  };

  const incoming = inbox?.incoming || [];
  const outgoing = inbox?.outgoing || [];
  const assignments = pendingAssignments || [];
  const waitingCount = incoming.length + assignments.length;

  return (
    <div className="grid gap-4 lg:grid-cols-2" dir="rtl">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Inbox className="h-4 w-4" /> بانتظار استلامك
            {waitingCount > 0 && <Badge variant="destructive">{waitingCount}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {waitingCount === 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> مفيش حاجة مستنية استلامك.
            </p>
          )}

          {assignments.map((a: any) => (
            <div key={a.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  {a.lead?.contact_name || 'عميل محتمل'}
                  {a.lead?.destination && <span className="text-muted-foreground"> — {a.lead.destination}</span>}
                </div>
                <Badge variant="secondary">إسناد جديد</Badge>
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" />
                المهلة: {a.ack_deadline_at ? new Date(a.ack_deadline_at).toLocaleString('ar-EG') : '—'}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => ack.mutate(a.lead_id)}>استلام</Button>
                {onOpenLead && a.lead_id && (
                  <Button size="sm" variant="ghost" onClick={() => onOpenLead(a.lead_id)}>فتح الملف</Button>
                )}
              </div>
            </div>
          ))}

          {incoming.map((h) => (
            <div key={h.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium">
                  {h.lead?.contact_name || 'ملف'}
                  {h.lead?.destination && <span className="text-muted-foreground"> — {h.lead.destination}</span>}
                </div>
                <Badge variant="outline">تسليم</Badge>
              </div>
              <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-2">
                <span>من {nameOf(h.from_user_id)}</span>
                <ArrowLeft className="h-3 w-3" />
                <span>{DEPARTMENT_LABELS[HANDOVER_FLOW[h.handover_type].to]}</span>
                <span>· {timeAgo(h.created_at)}</span>
              </div>
              {h.notes && <p className="text-xs bg-muted/50 rounded p-2">{h.notes}</p>}
              <div className="flex gap-2">
                <Button size="sm" onClick={() => accept.mutate(h.id)} disabled={accept.isPending}>استلام</Button>
                {onOpenLead && h.lead_id && (
                  <Button size="sm" variant="ghost" onClick={() => onOpenLead(h.lead_id!)}>فتح الملف</Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Send className="h-4 w-4" /> سلّمتها وبانتظار الطرف الآخر
            {outgoing.length > 0 && <Badge variant="secondary">{outgoing.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {outgoing.length === 0 && (
            <p className="text-sm text-muted-foreground">مفيش تسليمات معلّقة من عندك.</p>
          )}
          {outgoing.map((h) => (
            <div key={h.id} className="rounded-lg border p-3 space-y-1">
              <div className="text-sm font-medium">
                {h.lead?.contact_name || 'ملف'}
                {h.lead?.destination && <span className="text-muted-foreground"> — {h.lead.destination}</span>}
              </div>
              <div className="text-xs text-muted-foreground">
                {HANDOVER_LABELS[h.handover_type]} · بانتظار {nameOf(h.to_user_id)} · {timeAgo(h.created_at)}
              </div>
              {onOpenLead && h.lead_id && (
                <Button size="sm" variant="ghost" className="px-0" onClick={() => onOpenLead(h.lead_id!)}>
                  فتح الملف
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default HandoverInbox;
