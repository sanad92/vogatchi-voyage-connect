import React, { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Search, ExternalLink, RefreshCw, Check, ChevronDown, PanelRightClose, X } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { WhatsAppMessageComposer } from '@/components/whatsapp/WhatsAppMessageComposer';
import { PermissionGate } from '@/components/auth/PermissionGate';
import OptimizedErrorBoundary from '@/components/common/OptimizedErrorBoundary';
import { format } from 'date-fns';

import { WhatsAppMediaMessage } from '@/components/whatsapp/WhatsAppMediaMessage';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { useWhatsAppQueue } from '@/hooks/useWhatsAppQueue';
import { isQueuedConversation, isClosedConversation, orderQueue } from '@/lib/whatsappQueue';
import { ConversationRightPanel } from '@/components/whatsapp/ConversationRightPanel';
import { FollowupsBell } from '@/components/whatsapp/FollowupsBell';
import { useWhatsAppSettings } from '@/hooks/useWhatsAppSettings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CloseConversationDialog } from '@/components/whatsapp/CloseConversationDialog';
import { ConversationListItem } from '@/components/whatsapp/ConversationListItem';
import { ChatDateDivider, dayKeyOf, dayLabelOf } from '@/components/whatsapp/ChatDateDivider';


const WhatsAppInboxContent: React.FC = () => {
  const { conversations, conversationsLoading, conversationsError, refetch } = useWhatsApp();
  const { employee, canWork, claim, identityError, available, setAvailable, presenceError } = useWhatsAppQueue();
  const { hasPermission } = useSupabasePermissions();
  const { inboxes } = useWhatsAppSettings();
  const [view, setView] = useState<'queue' | 'mine' | 'all' | 'closed'>('queue');
  // The tools drawer only starts open when the screen is wide enough for it.
  const [showDetails, setShowDetails] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1280);

  const [messageSearch, setMessageSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');
  const [prefillText, setPrefillText] = useState('');
  const [prefillNonce, setPrefillNonce] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [inboxFilter, setInboxFilter] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const scrollViewportRef = useRef<HTMLDivElement | null>(null);


  // Supervisors see every conversation; an agent sees only the shared queue and their own chats.
  const isSupervisor = hasPermission('whatsapp_admin');
  const visibleConversations = useMemo(() => {
    const list = conversations || [];
    if (isSupervisor) return list;
    return list.filter((c: any) => c.assigned_to === employee?.id || (!c.assigned_to && isQueuedConversation(c)));
  }, [conversations, isSupervisor, employee?.id]);

  const filtered = useMemo(() => {
    let list = visibleConversations;
    if (inboxFilter !== 'all') list = list.filter(c => c.whatsapp_settings_id === inboxFilter);
    if (view === 'queue') list = orderQueue(list.filter(isQueuedConversation));
    if (view === 'mine') list = list.filter(c => c.assigned_to === employee?.id && !isClosedConversation(c));
    if (view === 'closed') list = list.filter(isClosedConversation);
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((c: any) =>
      (c.phone_number || '').toLowerCase().includes(q) ||
      (c.customer?.name || '').toLowerCase().includes(q)
    );
  }, [visibleConversations, search, view, employee?.id, inboxFilter]);

  React.useEffect(() => { setSelectedId(null); }, [employee?.id]);
  const selected = visibleConversations.find((c: any) => c.id === selectedId);
  const { messages, isLoading: messagesLoading, error: messagesError } = useWhatsAppMessages(selectedId || undefined);
  const queue = orderQueue(visibleConversations.filter(isQueuedConversation));
  const ownsSelected = !!selected && (selected.assigned_to === employee?.id || isSupervisor);
  const visibleMessages = useMemo(() => {
    const list = messages || [];
    const q = messageSearch.trim().toLowerCase();
    return list.filter((m: any) => {
      if (directionFilter !== 'all' && m.direction !== directionFilter) return false;
      if (!q) return true;
      return (m.content || '').toLowerCase().includes(q) || (m.template_name || '').toLowerCase().includes(q);
    });
  }, [messages, messageSearch, directionFilter]);

  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'auto') => {
    const el = scrollViewportRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  // Keep the newest message in view and surface a jump button while scrolled up.
  React.useEffect(() => {
    const el = scrollViewportRef.current;
    if (!el) return;
    const onScroll = () => {
      setShowScrollDown(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
    };
    el.addEventListener('scroll', onScroll);
    onScroll();
    return () => el.removeEventListener('scroll', onScroll);
  }, [selectedId]);

  React.useEffect(() => {
    if (!showScrollDown) scrollToBottom();
  }, [visibleMessages.length, selectedId, scrollToBottom, showScrollDown]);

  const pickup = async (id: string) => {
    try { const claimed = await claim.mutateAsync(id); setView('mine'); setSelectedId(claimed); }
    catch { /* mutation displays the error and refreshes the list */ }
  };
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <div className="border-b bg-card/80 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-[image:var(--gradient-brand)] flex items-center justify-center shadow-[var(--shadow-glow)]">
          <MessageCircle className="h-4.5 w-4.5 text-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="text-base font-bold leading-tight">مركز المحادثات</h1>
          <p className="text-xs text-muted-foreground">{visibleConversations.length} محادثة · {queue.length} في الطابور</p>
        </div>
        <div className="ms-auto flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} aria-label="تحديث المحادثات"><RefreshCw className="h-4 w-4" /></Button>
          {canWork && <Button size="sm" variant={available ? 'default' : 'outline'} disabled={!employee} className="rounded-full"
            onClick={() => setAvailable(v => !v)}>
            <span className={`me-1.5 h-2 w-2 rounded-full ${available ? 'bg-success' : 'bg-muted-foreground'}`} />
            {available ? 'متاح للتوزيع' : 'غير متاح'}</Button>}
          <FollowupsBell />
        </div>
      </div>


      {presenceError && <p role="alert" className="px-4 py-2 text-sm text-destructive">{presenceError}</p>}
      {conversationsError && <div role="alert" className="p-3 bg-destructive/10 text-destructive">تعذر تحميل المحادثات. تحقق من الاتصال والصلاحيات ثم اضغط تحديث.</div>}
      {canWork && !employee && <div role="status" className="px-4 py-2 text-sm bg-muted">{identityError ? 'تعذر التحقق من ملف الموظف؛ أعد المحاولة قبل الاستلام.' : 'لاستلام المحادثات، اربط حسابك بملف موظف نشط في المؤسسة من فريق العمل.'}</div>}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Conversations list */}
        <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-[330px] md:shrink-0 border-l bg-card/40 flex-col overflow-hidden`}>
          <div className="p-3 border-b space-y-3">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث برقم أو اسم العميل..."
                className="pr-9 rounded-full bg-muted/60 border-transparent focus-visible:bg-background"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-0.5" aria-label="تصنيف المحادثات">
              {(([['queue', 'الطابور'], ['mine', 'محادثاتي'], ...(isSupervisor ? [['all', 'الكل']] : []), ['closed', 'المغلقة']] as const) as ReadonlyArray<readonly ['queue' | 'mine' | 'all' | 'closed', string]>).map(([key, label]) =>
                <Button key={key} size="sm" variant={view === key ? 'default' : 'ghost'} aria-pressed={view === key}
                  className="h-7 rounded-full px-3 text-xs shrink-0"
                  onClick={() => { setView(key); setSelectedId(null); }}>{label}{key === 'queue' && queue.length ? ` ${queue.length}` : ''}</Button>)}
            </div>
            {inboxes.length > 1 && (
              <Select value={inboxFilter} onValueChange={(value) => { setInboxFilter(value); setSelectedId(null); }}>
                <SelectTrigger className="h-9 rounded-full" aria-label="اختيار رقم واتساب"><SelectValue placeholder="كل الأرقام" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأرقام</SelectItem>
                  {inboxes.map(inbox => (
                    <SelectItem key={inbox.id} value={inbox.id}>
                      {inbox.label || inbox.display_phone_number || inbox.business_name || 'رقم واتساب'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {view === 'queue' && <Button className="w-full rounded-full" disabled={!employee || !canWork || !queue.length || claim.isPending}
              onClick={() => pickup('')}>{claim.isPending ? 'جاري الاستلام…' : 'استلام التالي'}</Button>}
            {view === 'queue' && <p className="text-xs text-muted-foreground">الأولوية أولًا، ثم الأقدم حسب تاريخ فتح المحادثة.</p>}
          </div>


          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversationsLoading ? (
                <div className="p-4 space-y-2">
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} className="flex items-start gap-3 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2 pt-1">
                        <div className="h-3 w-1/2 rounded bg-muted" />
                        <div className="h-2.5 w-3/4 rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversationsError ? (<p className="p-4 text-sm text-destructive">القائمة غير متاحة حاليًا</p>) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageCircle className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">لا توجد محادثات في هذا القسم</p>
                </div>
              ) : (
                filtered.map((c: any) => (
                  <ConversationListItem
                    key={c.id}
                    conversation={c}
                    active={c.id === selectedId}
                    onSelect={() => setSelectedId(c.id)}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </aside>


        {/* Messages panel */}
        <section className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col overflow-hidden bg-chat-canvas`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div className="max-w-xs">
                <div className="h-16 w-16 rounded-2xl bg-[image:var(--gradient-brand)] flex items-center justify-center mx-auto mb-4 shadow-[var(--shadow-brand)]">
                  <MessageCircle className="h-8 w-8 text-primary-foreground" />
                </div>
                <p className="font-medium">اختر محادثة لبدء الرد</p>
                <p className="text-sm text-muted-foreground mt-1">كل محادثات عملائك في مكان واحد، مرتبة حسب الأحدث.</p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="px-3 py-2.5 border-b bg-card/80 backdrop-blur-md flex items-center gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <Button className="md:hidden shrink-0" variant="ghost" size="sm" onClick={() => setSelectedId(null)}>رجوع</Button>
                  <div className="h-9 w-9 rounded-full bg-[image:var(--gradient-brand)] text-primary-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                    {(selected.customer?.name?.trim()?.split(/\s+/).slice(0, 2).map((p: string) => p[0]).join('')) || selected.phone_number?.slice(-2)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate" dir={selected.customer?.name ? 'rtl' : 'ltr'}>
                      {selected.customer?.name || selected.phone_number}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {selected.inbox
                        ? `عبر ${selected.inbox.label || selected.inbox.display_phone_number || selected.inbox.business_name || 'واتساب'}`
                        : 'واتساب'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                  {isQueuedConversation(selected) && canWork && <Button size="sm" disabled={!employee || claim.isPending} onClick={() => pickup(selected.id)}>استلام</Button>}
                  <CloseConversationDialog conversationId={selected.id} organizationId={selected.organization_id}
                    isClosed={isClosedConversation(selected)} canClose={ownsSelected}
                    blockedReason={selected.assigned_to ? 'المحادثة مسندة لموظف آخر؛ اطلب التحويل من المشرف.' : 'استلم المحادثة أولًا قبل إنهائها.'} />
                  <Button variant="ghost" size="sm" onClick={() => setShowSearch(v => !v)} aria-label="بحث داخل المحادثة" aria-pressed={showSearch}>
                    <Search className="h-4 w-4" />
                  </Button>
                  <Button variant={showDetails ? 'secondary' : 'ghost'} size="sm" onClick={() => setShowDetails(v => !v)}>
                    <PanelRightClose className="h-4 w-4 me-1" />
                    الأدوات
                  </Button>
                  <Button variant="ghost" size="sm" asChild aria-label="شاشة كاملة">
                    <Link to={`/whatsapp-inbox/${selected.id}`}><ExternalLink className="h-4 w-4" /></Link>
                  </Button>
                </div>
              </div>

              {/* Inline message search & direction filter */}
              {showSearch && (
                <div className="px-4 py-2 border-b bg-card/60 backdrop-blur flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input value={messageSearch} onChange={(e) => setMessageSearch(e.target.value)}
                      placeholder="ابحث داخل رسائل هذه المحادثة..." className="pr-9 h-9 rounded-full" />
                  </div>
                  <div className="inline-flex rounded-full bg-muted p-0.5">
                    {(['all', 'inbound', 'outbound'] as const).map((v) => (
                      <Button key={v} size="sm" variant={directionFilter === v ? 'default' : 'ghost'}
                        className="h-7 rounded-full px-3 text-xs"
                        onClick={() => setDirectionFilter(v)}>
                        {v === 'all' ? 'الكل' : v === 'inbound' ? 'الوارد' : 'الصادر'}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              <div className="relative flex-1 min-h-0">
                <ScrollArea className="h-full" viewportRef={scrollViewportRef}>
                  <div className="p-4 space-y-1.5 max-w-3xl mx-auto">
                    {messagesLoading ? (
                      <div className="space-y-3 py-6">
                        {[0, 1, 2].map(i => (
                          <div key={i} className={`flex ${i % 2 ? 'justify-start' : 'justify-end'}`}>
                            <div className="h-14 w-52 rounded-2xl bg-muted animate-pulse" />
                          </div>
                        ))}
                      </div>
                    ) : messagesError ? (<p role="alert" className="text-destructive">تعذر تحميل الرسائل. أعد فتح المحادثة أو حدّث الصفحة.</p>) : visibleMessages.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground py-10">
                        {messageSearch.trim() || directionFilter !== 'all' ? 'لا توجد رسائل مطابقة' : 'لا توجد رسائل في هذه المحادثة'}
                      </div>
                    ) : (
                      visibleMessages.map((m: any, index: number) => {
                        const outbound = m.direction === 'outbound';
                        const prev = visibleMessages[index - 1] as any;
                        const newDay = !prev || dayKeyOf(prev.sent_at) !== dayKeyOf(m.sent_at);
                        const grouped = !newDay && prev?.direction === m.direction;
                        return (
                          <React.Fragment key={m.id}>
                            {newDay && <ChatDateDivider label={dayLabelOf(m.sent_at)} />}
                            <div className={`flex ${outbound ? 'justify-start' : 'justify-end'} ${grouped ? 'pt-0.5' : 'pt-2'}`}>
                              <div
                                className={`max-w-[78%] px-3 py-2 shadow-[var(--shadow-sm)] border text-sm leading-relaxed ${
                                  outbound
                                    ? 'bg-chat-out text-chat-out-foreground border-transparent rounded-2xl rounded-bl-md'
                                    : 'bg-chat-in text-chat-in-foreground border-border rounded-2xl rounded-br-md'
                                }`}
                              >
                                <WhatsAppMediaMessage message={m} outbound={outbound} />
                                <div className={`flex items-center justify-end gap-1.5 text-[10px] mt-1 ${outbound ? 'text-chat-out-foreground/70' : 'text-muted-foreground'}`}>
                                  <span>{format(new Date(m.sent_at), 'HH:mm')}</span>
                                  {outbound && (
                                    <span className="inline-flex items-center">
                                      {m.read_at ? (
                                        <><Check className="h-3 w-3 text-info" /><Check className="h-3 w-3 -ms-2 text-info" /></>
                                      ) : m.delivered_at || m.status === 'delivered' ? (
                                        <><Check className="h-3 w-3" /><Check className="h-3 w-3 -ms-2" /></>
                                      ) : m.status === 'sent' ? (
                                        <Check className="h-3 w-3" />
                                      ) : (
                                        <span className="uppercase">{m.status}</span>
                                      )}
                                    </span>
                                  )}
                                </div>
                                {m.status === 'failed' && m.error_message && (
                                  <div className="text-[11px] bg-destructive/15 text-destructive rounded-lg p-1.5 mt-1">
                                    {m.error_message}
                                  </div>
                                )}
                              </div>
                            </div>
                          </React.Fragment>
                        );
                      })
                    )}
                  </div>
                </ScrollArea>
                {showScrollDown && (
                  <Button size="icon" variant="secondary" aria-label="اذهب لآخر رسالة"
                    className="absolute bottom-4 left-4 rounded-full shadow-[var(--shadow-lg)]"
                    onClick={() => scrollToBottom('smooth')}>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                )}
              </div>


              {/* Composer */}
              <div className="border-t bg-card/80 backdrop-blur-md p-3">
                {canWork && (selected.assigned_to === employee?.id || hasPermission('whatsapp_admin')) ? <WhatsAppMessageComposer
                  conversationId={selected.id}
                  prefillText={prefillText}
                  prefillNonce={prefillNonce}
                  contactName={selected.customer?.name}
                  contactPhone={selected.phone_number}
                  onMessageSent={() => scrollToBottom('smooth')}
                /> : <p className="text-sm text-muted-foreground text-center py-2">{selected.assigned_to ? 'المحادثة مسندة لموظف آخر؛ اطلب التحويل من المشرف.' : 'استلم المحادثة أولًا للرد وإيقاف البوت.'}</p>}
              </div>
            </>
          )}
        </section>
        {selected && showDetails && <aside className="absolute inset-0 z-20 bg-background xl:static xl:w-[340px] xl:shrink-0 border-r overflow-y-auto animate-in slide-in-from-left-4 duration-200">
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 px-3 py-2 border-b bg-card/90 backdrop-blur">
            <span className="text-sm font-semibold">أدوات الواتساب</span>
            <Button variant="ghost" size="icon" aria-label="إغلاق الأدوات" onClick={() => setShowDetails(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <ConversationRightPanel conversationId={selected.id} conversation={selected}
            onInsertText={text => { setPrefillText(text); setPrefillNonce(n => n + 1); }} />
        </aside>}

      </div>
    </div>
  );
};

const WhatsAppInbox: React.FC = () => (
  <OptimizedErrorBoundary>
    <PermissionGate
      requiredRole="viewer"
      fallback={
        <div className="min-h-dvh flex items-center justify-center">
          <p className="text-muted-foreground">لا تملك صلاحية عرض محادثات واتساب</p>
        </div>
      }
    >
      <WhatsAppInboxContent />
    </PermissionGate>
  </OptimizedErrorBoundary>
);

export default WhatsAppInbox;
