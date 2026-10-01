import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, RefreshCw, Settings, Search, PenSquare, Loader2, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useEmailAccounts, useEmailThreads, isThreadUnread, invokeEmailFn } from '@/hooks/useEmail';
import { EmailAccountsDialog } from '@/components/email/EmailAccountsDialog';
import { EmailThreadView } from '@/components/email/EmailThreadView';
import { EmailComposer } from '@/components/email/EmailComposer';

type Tab = 'queue' | 'mine' | 'all';

export default function EmailInbox() {
  const { user } = useOptimizedAuth();
  const { organizationId, orgRole } = useOrganization();
  const qc = useQueryClient();
  const isAdmin = orgRole === 'owner' || orgRole === 'admin';
  const isSupervisor = isAdmin || orgRole === 'manager';
  const { data: accounts = [], isLoading: accLoading } = useEmailAccounts();
  const { data: threads = [], isLoading } = useEmailThreads();
  const [tab, setTab] = useState<Tab>('queue');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeAccount, setComposeAccount] = useState<string>('');
  const [syncing, setSyncing] = useState(false);

  const ownerIds = useMemo(() => [...new Set(threads.map((t) => t.assigned_to).filter(Boolean))] as string[], [threads]);
  const { data: owners = {} } = useQuery({
    queryKey: ['email-owner-names', ownerIds.join(',')],
    enabled: ownerIds.length > 0,
    queryFn: async () => {
      const { data } = await (supabase as any).from('profiles').select('id, full_name').in('id', ownerIds);
      return Object.fromEntries((data ?? []).map((p: any) => [p.id, p.full_name])) as Record<string, string>;
    },
  });

  const counts = useMemo(() => ({
    queue: threads.filter((t) => !t.assigned_to && t.status === 'open').length,
    mine: threads.filter((t) => t.assigned_to === user?.id).length,
  }), [threads, user?.id]);

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter((t) => {
      if (tab === 'queue' && (t.assigned_to || t.status !== 'open')) return false;
      if (tab === 'mine' && t.assigned_to !== user?.id) return false;
      if (!q) return true;
      return [t.subject, t.contact_email, t.contact_name, t.snippet].some((v) => v?.toLowerCase().includes(q));
    });
  }, [threads, tab, search, user?.id]);

  const selected = threads.find((t) => t.id === selectedId) || null;

  const syncNow = async () => {
    setSyncing(true);
    try { await invokeEmailFn('email-sync', { organizationId }); qc.invalidateQueries({ queryKey: ['email-threads', organizationId] }); qc.invalidateQueries({ queryKey: ['email-accounts', organizationId] }); toast.success('تم التحديث'); }
    catch (e: any) { toast.error(e.message); } finally { setSyncing(false); }
  };

  if (!accLoading && accounts.length === 0) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-6" dir="rtl">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"><Mail className="h-8 w-8 text-primary" /></div>
          <h1 className="text-2xl font-semibold">صندوق البريد</h1>
          <p className="text-muted-foreground">اربط بريد الشركة (Gmail أو Outlook أو بريد الاستضافة) عشان تقرأ رسائل العملاء وترد عليها من هنا.</p>
          <Button onClick={() => setSettingsOpen(true)}>{isAdmin ? 'ربط بريد الشركة' : 'عرض الحسابات'}</Button>
        </div>
        <EmailAccountsDialog open={settingsOpen} onOpenChange={setSettingsOpen} canManage={isAdmin} />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col" dir="rtl">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <Mail className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold">صندوق البريد</h1>
        <span className="text-sm text-muted-foreground">{threads.length} محادثة</span>
        <div className="flex-1" />
        <Button size="sm" onClick={() => { setComposeAccount(accounts[0]?.id || ''); setComposeOpen(true); }}><PenSquare className="h-4 w-4 ml-1" />رسالة جديدة</Button>
        <Button size="sm" variant="outline" onClick={syncNow} disabled={syncing}>{syncing ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <RefreshCw className="h-4 w-4 ml-1" />}تحديث الآن</Button>
        <Button size="sm" variant="ghost" onClick={() => setSettingsOpen(true)} aria-label="الإعدادات"><Settings className="h-4 w-4" /></Button>
      </div>

      <div className="flex min-h-0 flex-1">
        <aside className={`flex w-full flex-col border-l border-border md:w-96 ${selected ? 'hidden md:flex' : 'flex'}`}>
          <div className="space-y-2 p-3">
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
              <TabsList className="w-full">
                <TabsTrigger value="queue" className="flex-1">الطابور ({counts.queue})</TabsTrigger>
                <TabsTrigger value="mine" className="flex-1">رسايلي ({counts.mine})</TabsTrigger>
                {isSupervisor && <TabsTrigger value="all" className="flex-1">الكل</TabsTrigger>}
              </TabsList>
            </Tabs>
            <div className="relative">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pr-9" placeholder="بحث بالموضوع أو البريد…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading && <Loader2 className="mx-auto mt-8 h-5 w-5 animate-spin text-muted-foreground" />}
            {!isLoading && !list.length && <div className="p-8 text-center text-sm text-muted-foreground"><Inbox className="mx-auto mb-2 h-6 w-6" />لا توجد رسائل هنا</div>}
            {list.map((t) => {
              const unread = isThreadUnread(t) && t.id !== selectedId;
              return (
                <button key={t.id} onClick={() => setSelectedId(t.id)}
                  className={`block w-full border-b border-border px-4 py-3 text-right transition-colors hover:bg-accent ${t.id === selectedId ? 'bg-accent' : ''}`}>
                  <div className="flex items-center gap-2">
                    {unread && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                    <span className={`flex-1 truncate ${unread ? 'font-semibold' : ''}`}>{t.contact_name || t.contact_email}</span>
                    <time className="shrink-0 text-xs text-muted-foreground">{new Date(t.last_message_at).toLocaleDateString('ar-EG')}</time>
                  </div>
                  <div className="truncate text-xs text-muted-foreground" dir="ltr">{t.contact_email}</div>
                  <div className={`truncate text-sm ${unread ? 'text-foreground' : 'text-muted-foreground'}`}>{t.subject}</div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex-1 truncate">{t.snippet}</span>
                    {t.assigned_to && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5">{t.assigned_to === user?.id ? 'معك' : owners[t.assigned_to] || 'مستلمة'}</span>}
                    {t.status === 'closed' && <span className="shrink-0 rounded-full bg-muted px-2 py-0.5">منتهية</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <main className={`min-w-0 flex-1 ${selected ? 'block' : 'hidden md:block'}`}>
          {selected && user ? (
            <div className="flex h-full flex-col">
              <Button variant="ghost" size="sm" className="m-2 self-start md:hidden" onClick={() => setSelectedId(null)}>رجوع</Button>
              <div className="min-h-0 flex-1"><EmailThreadView thread={selected} userId={user.id} ownerName={selected.assigned_to ? owners[selected.assigned_to] : null} isSupervisor={isSupervisor} /></div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground"><div className="text-center"><Mail className="mx-auto mb-2 h-8 w-8" />اختر محادثة لعرضها</div></div>
          )}
        </main>
      </div>

      <EmailAccountsDialog open={settingsOpen} onOpenChange={setSettingsOpen} canManage={isAdmin} />
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader><DialogTitle>رسالة جديدة</DialogTitle></DialogHeader>
          {accounts.length > 1 && (
            <Select value={composeAccount} onValueChange={setComposeAccount}>
              <SelectTrigger><SelectValue placeholder="الإرسال من" /></SelectTrigger>
              <SelectContent>{accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.email_address}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <EmailComposer accountId={composeAccount || accounts[0]?.id} onSent={(id) => { setComposeOpen(false); setTab('mine'); setSelectedId(id); qc.invalidateQueries({ queryKey: ['email-threads', organizationId] }); }} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
