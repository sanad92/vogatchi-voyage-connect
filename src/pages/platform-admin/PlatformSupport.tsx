import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LifeBuoy, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import PageHeader from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import TicketThread from '@/components/support/TicketThread';
import { isSlaBreached, STATUS_VARIANT, TICKET_CATEGORIES, TICKET_PRIORITIES, TICKET_STATUSES, type SupportTicket } from '@/components/support/support-meta';

const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 };

const PlatformSupport = () => {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState('active');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: tickets = [] } = useQuery({
    queryKey: ['support-tickets', 'platform'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('support_tickets').select('*, organizations(name)').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      return data as SupportTicket[];
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await (supabase as any).from('support_tickets').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['support-tickets'] }),
    onError: (e: any) => toast({ title: 'تعذر التحديث', description: e.message, variant: 'destructive' }),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets
      .filter((t) => (status === 'all' ? true : status === 'active' ? !['resolved', 'closed'].includes(t.status) : t.status === status))
      .filter((t) => !q || t.subject.toLowerCase().includes(q) || (t.organizations?.name ?? '').toLowerCase().includes(q) || String(t.ticket_number) === q)
      .sort((a, b) => Number(isSlaBreached(b)) - Number(isSlaBreached(a)) || PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
  }, [tickets, status, search]);

  const selected = tickets.find((t) => t.id === selectedId) ?? null;
  const breached = tickets.filter(isSlaBreached).length;
  const resolvedWithResponse = tickets.filter((t) => t.first_response_at);
  const avgFirstResponseH = resolvedWithResponse.length
    ? resolvedWithResponse.reduce((s, t) => s + (new Date(t.first_response_at!).getTime() - new Date(t.created_at).getTime()), 0) / resolvedWithResponse.length / 3_600_000
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="تذاكر الدعم" description="طلبات الشركات المشتركة مرتبة حسب تجاوز وقت الاستجابة والأولوية." icon={LifeBuoy} />

      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">مفتوحة</p><p className="text-2xl font-semibold">{tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">تجاوزت وقت الاستجابة</p><p className="text-2xl font-semibold text-destructive">{breached}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">متوسط أول رد</p><p className="text-2xl font-semibold">{avgFirstResponseH.toFixed(1)} س</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">تم حلها</p><p className="text-2xl font-semibold">{tickets.filter((t) => ['resolved', 'closed'].includes(t.status)).length}</p></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Input className="max-w-xs" placeholder="بحث بالعنوان أو الشركة أو الرقم" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">النشطة</SelectItem>
            <SelectItem value="all">الكل</SelectItem>
            {Object.entries(TICKET_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card className="divide-y divide-border max-h-[60vh] overflow-y-auto">
        {filtered.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">لا توجد تذاكر.</p>}
        {filtered.map((t) => (
          <button key={t.id} onClick={() => setSelectedId(t.id)} className="flex w-full items-center justify-between gap-3 p-4 text-start hover:bg-muted/50">
            <div className="min-w-0">
              <p className="font-medium truncate">#{t.ticket_number} · {t.subject}</p>
              <p className="text-xs text-muted-foreground">{t.organizations?.name} · {TICKET_CATEGORIES[t.category]} · {new Date(t.created_at).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isSlaBreached(t) && <AlertTriangle className="h-4 w-4 text-destructive" aria-label="تجاوز وقت الاستجابة" />}
              <Badge variant={t.priority === 'urgent' ? 'destructive' : 'outline'}>{TICKET_PRIORITIES[t.priority]}</Badge>
              <Badge variant={STATUS_VARIANT[t.status]}>{TICKET_STATUSES[t.status]}</Badge>
            </div>
          </button>
        ))}
      </Card>

      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelectedId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>#{selected?.ticket_number} · {selected?.subject}</DialogTitle></DialogHeader>
          {selected && (
            <>
              <p className="text-sm text-muted-foreground">{selected.organizations?.name}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Select value={selected.status} onValueChange={(v) => update.mutate({ id: selected.id, patch: { status: v } })}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TICKET_STATUSES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Select value={selected.priority} onValueChange={(v) => update.mutate({ id: selected.id, patch: { priority: v } })}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(TICKET_PRIORITIES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={async () => {
                  const { data } = await supabase.auth.getUser();
                  update.mutate({ id: selected.id, patch: { assigned_to: data.user?.id } });
                }}>{selected.assigned_to ? 'إعادة الاستلام' : 'استلام التذكرة'}</Button>
              </div>
              <TicketThread ticket={selected} staffMode />
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlatformSupport;
