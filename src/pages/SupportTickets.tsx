import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LifeBuoy, Plus, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import PageHeader from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import TicketThread from '@/components/support/TicketThread';
import { STATUS_VARIANT, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type SupportTicket } from '@/components/support/support-meta';

const SupportTickets = () => {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [form, setForm] = useState({ subject: '', description: '', category: 'general', priority: 'normal' });

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['support-tickets', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('support_tickets').select('*').eq('organization_id', orgId).order('created_at', { ascending: false });
      if (error) throw error;
      return data as SupportTicket[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await (supabase as any).from('support_tickets').insert({
        ...form, subject: form.subject.trim(), organization_id: orgId, created_by: u.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setOpen(false);
      setForm({ subject: '', description: '', category: 'general', priority: 'normal' });
      qc.invalidateQueries({ queryKey: ['support-tickets'] });
      toast({ title: 'تم فتح التذكرة', description: 'سيتواصل معكم فريق الدعم في أقرب وقت.' });
    },
    onError: (e: any) => toast({ title: 'تعذر فتح التذكرة', description: e.message, variant: 'destructive' }),
  });

  const active = tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="الدعم الفني"
        description="تواصل مع فريق SafarERP بخصوص أي مشكلة أو استفسار وتابع حلها خطوة بخطوة."
        icon={LifeBuoy}
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 me-1" />تذكرة جديدة</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">تذاكر مفتوحة</p><p className="text-2xl font-semibold">{active}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">بانتظار ردكم</p><p className="text-2xl font-semibold">{tickets.filter((t) => t.status === 'waiting_customer').length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">تم حلها</p><p className="text-2xl font-semibold">{tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length}</p></Card>
      </div>

      <Card className="divide-y divide-border">
        {isLoading && <p className="p-6 text-sm text-muted-foreground">جارٍ التحميل...</p>}
        {!isLoading && tickets.length === 0 && (
          <div className="p-10 text-center text-sm text-muted-foreground">لا توجد تذاكر بعد. افتح تذكرة وسيرد عليك فريق الدعم.</div>
        )}
        {tickets.map((t) => (
          <button key={t.id} onClick={() => setSelected(t)} className="flex w-full items-center justify-between gap-3 p-4 text-start hover:bg-muted/50">
            <div className="min-w-0">
              <p className="font-medium truncate">#{t.ticket_number} · {t.subject}</p>
              <p className="text-xs text-muted-foreground">{TICKET_CATEGORIES[t.category]} · {new Date(t.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline">{TICKET_PRIORITIES[t.priority]}</Badge>
              <Badge variant={STATUS_VARIANT[t.status]}>{TICKET_STATUSES[t.status]}</Badge>
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
            </div>
          </button>
        ))}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>تذكرة دعم جديدة</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>العنوان</Label><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="مثال: الفاتورة لا تظهر في الخزينة" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>التصنيف</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TICKET_CATEGORIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>الأولوية</Label>
                <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TICKET_PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>تفاصيل المشكلة</Label><Textarea rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="اشرح ما حدث والخطوات التي قمت بها." /></div>
            <Button className="w-full" disabled={form.subject.trim().length < 3 || create.isPending} onClick={() => create.mutate()}>فتح التذكرة</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>#{selected?.ticket_number} · {selected?.subject}</DialogTitle></DialogHeader>
          {selected && <TicketThread ticket={tickets.find((t) => t.id === selected.id) ?? selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupportTickets;
