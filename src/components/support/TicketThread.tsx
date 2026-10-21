import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { STATUS_VARIANT, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type SupportTicket } from './support-meta';

interface Props {
  ticket: SupportTicket;
  staffMode?: boolean;
}

const TicketThread = ({ ticket, staffMode = false }: Props) => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);

  const { data: messages = [] } = useQuery({
    queryKey: ['support-messages', ticket.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('support_ticket_messages')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at');
      if (error) throw error;
      return data as any[];
    },
  });

  const send = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('support_ticket_messages').insert({
        ticket_id: ticket.id,
        organization_id: ticket.organization_id,
        author_id: u.user?.id,
        body: body.trim(),
        is_staff: staffMode,
        is_internal: staffMode && internal,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBody('');
      setInternal(false);
      qc.invalidateQueries({ queryKey: ['support-messages', ticket.id] });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
    },
    onError: (e: any) => toast({ title: 'تعذر إرسال الرد', description: e.message, variant: 'destructive' }),
  });

  const closed = ticket.status === 'closed';

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs">
        <Badge variant={STATUS_VARIANT[ticket.status]}>{TICKET_STATUSES[ticket.status]}</Badge>
        <Badge variant="outline">{TICKET_CATEGORIES[ticket.category]}</Badge>
        <Badge variant="outline">الأولوية: {TICKET_PRIORITIES[ticket.priority]}</Badge>
      </div>
      <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap">{ticket.description || '—'}</div>

      <div className="space-y-2 max-h-[45vh] overflow-y-auto">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'rounded-lg border p-3 text-sm',
              m.is_internal ? 'border-dashed border-accent bg-accent/10' : m.is_staff ? 'border-primary/30 bg-primary/5' : 'border-border bg-card',
            )}
          >
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{m.is_internal ? 'ملاحظة داخلية' : m.is_staff ? 'فريق دعم SafarERP' : 'الشركة'}</span>
              <span>{new Date(m.created_at).toLocaleString()}</span>
            </div>
            <p className="whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
        {messages.length === 0 && <p className="text-sm text-muted-foreground">لا توجد ردود بعد.</p>}
      </div>

      {!closed && (
        <div className="space-y-2">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب ردك..." rows={3} />
          <div className="flex items-center justify-between gap-2">
            {staffMode ? (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Checkbox checked={internal} onCheckedChange={(v) => setInternal(!!v)} />
                ملاحظة داخلية (لا تظهر للشركة)
              </label>
            ) : <span />}
            <Button size="sm" disabled={!body.trim() || send.isPending} onClick={() => send.mutate()}>
              إرسال الرد
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketThread;
