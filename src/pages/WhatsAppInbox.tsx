import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Phone, Search, ArrowDownLeft, ArrowUpRight, Clock, ExternalLink, RefreshCw, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWhatsApp } from '@/hooks/useWhatsApp';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { WhatsAppMessageComposer } from '@/components/whatsapp/WhatsAppMessageComposer';
import { PermissionGate } from '@/components/auth/PermissionGate';
import OptimizedErrorBoundary from '@/components/common/OptimizedErrorBoundary';
import { formatDistanceToNow, format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { WhatsAppMediaMessage } from '@/components/whatsapp/WhatsAppMediaMessage';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { useWhatsAppQueue } from '@/hooks/useWhatsAppQueue';
import { isQueuedConversation, isClosedConversation, orderQueue } from '@/lib/whatsappQueue';
import { ConversationRightPanel } from '@/components/whatsapp/ConversationRightPanel';
import { FollowupsBell } from '@/components/whatsapp/FollowupsBell';

const WhatsAppInboxContent: React.FC = () => {
  const { conversations, conversationsLoading, conversationsError, refetch } = useWhatsApp();
  const { employee, canWork, claim, identityError, available, setAvailable, presenceError } = useWhatsAppQueue();
  const { hasPermission } = useSupabasePermissions();
  const [view, setView] = useState<'queue' | 'mine' | 'all' | 'closed'>('queue');
  const [showDetails, setShowDetails] = useState(false);
  const [prefillText, setPrefillText] = useState('');
  const [prefillNonce, setPrefillNonce] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = conversations || [];
    if (view === 'queue') list = orderQueue(list.filter(isQueuedConversation));
    if (view === 'mine') list = list.filter(c => c.assigned_to === employee?.id && !isClosedConversation(c));
    if (view === 'closed') list = list.filter(isClosedConversation);
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((c: any) =>
      (c.phone_number || '').toLowerCase().includes(q) ||
      (c.customer?.name || '').toLowerCase().includes(q)
    );
  }, [conversations, search, view, employee?.id]);

  React.useEffect(() => { setSelectedId(null); }, [employee?.id]);
  const selected = (conversations || []).find((c: any) => c.id === selectedId);
  const { messages, isLoading: messagesLoading, error: messagesError } = useWhatsAppMessages(selectedId || undefined);
  const queue = orderQueue((conversations || []).filter(isQueuedConversation));
  const pickup = async (id: string) => {
    try { const claimed = await claim.mutateAsync(id); setView('mine'); setSelectedId(claimed); }
    catch { /* mutation displays the error and refreshes the list */ }
  };
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center gap-3">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">مركز المحادثات</h1>
        <div className="ms-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} aria-label="تحديث المحادثات"><RefreshCw className="h-4 w-4" /></Button>
          {canWork && <Button size="sm" variant={available ? 'default' : 'outline'} disabled={!employee}
            onClick={() => setAvailable(v => !v)}>{available ? 'متاح للتوزيع' : 'غير متاح'}</Button>}
          <FollowupsBell />
          <Badge variant="secondary">
            {conversations?.length || 0} محادثة
          </Badge>
        </div>
      </div>

      {presenceError && <p role="alert" className="px-4 py-2 text-sm text-destructive">{presenceError}</p>}
      {conversationsError && <div role="alert" className="p-3 bg-destructive/10 text-destructive">تعذر تحميل المحادثات. تحقق من الاتصال والصلاحيات ثم اضغط تحديث.</div>}
      {canWork && !employee && <div role="status" className="px-4 py-2 text-sm bg-muted">{identityError ? 'تعذر التحقق من ملف الموظف؛ أعد المحاولة قبل الاستلام.' : 'لاستلام المحادثات، اربط حسابك بملف موظف نشط في المؤسسة من فريق العمل.'}</div>}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Conversations list */}
        <aside className={`${selectedId ? 'hidden md:flex' : 'flex'} w-full md:w-[320px] md:shrink-0 border-l bg-muted/20 flex-col overflow-hidden`}>
          <div className="p-3 border-b bg-card space-y-3">
            <div className="grid grid-cols-2 gap-1" aria-label="تصنيف المحادثات">
              {([['queue', 'الطابور'], ['mine', 'محادثاتي'], ['all', 'الكل'], ['closed', 'المغلقة']] as const).map(([key, label]) =>
                <Button key={key} size="sm" variant={view === key ? 'default' : 'ghost'} aria-pressed={view === key}
                  onClick={() => { setView(key); setSelectedId(null); }}>{label}{key === 'queue' ? ` (${queue.length})` : ''}</Button>)}
            </div>
            {view === 'queue' && <Button className="w-full" disabled={!employee || !canWork || !queue.length || claim.isPending}
              onClick={() => pickup('')}>{claim.isPending ? 'جاري الاستلام…' : 'استلام التالي'}</Button>}
            {view === 'queue' && <p className="text-xs text-muted-foreground">الأولوية أولًا، ثم الأقدم حسب تاريخ فتح المحادثة.</p>}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث برقم أو اسم العميل..."
                className="pr-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {conversationsLoading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  جاري التحميل...
                </div>
              ) : conversationsError ? (<p className="p-4 text-sm text-destructive">القائمة غير متاحة حاليًا</p>) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  لا توجد محادثات
                </div>
              ) : (
                filtered.map((c: any) => {
                  const active = c.id === selectedId;
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-right p-3 rounded-lg border transition-colors ${
                        active
                          ? 'bg-primary/10 border-primary'
                          : 'bg-card border-transparent hover:bg-accent'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="font-medium text-sm truncate">
                            {c.phone_number}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {c.last_message_at &&
                            formatDistanceToNow(new Date(c.last_message_at), {
                              addSuffix: true,
                              locale: ar,
                            })}
                        </span>
                      </div>
                      {c.customer?.name && (
                        <div className="text-xs text-muted-foreground truncate">
                          {c.customer.name}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-muted-foreground">
                        <RefreshCw className="h-2.5 w-2.5" />
                        <span>
                          {c.last_inbound_at
                            ? `آخر رسالة واردة ${formatDistanceToNow(new Date(c.last_inbound_at), { addSuffix: true, locale: ar })}`
                            : 'لا يوجد استلام بعد'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] py-0 h-4">
                          {c.status === 'active'
                            ? 'نشط'
                            : c.status === 'pending'
                            ? 'انتظار'
                            : c.status === 'closed'
                            ? 'مغلق'
                            : c.status}
                        </Badge>
                        {c.sla_breached_first_response && (
                          <Badge variant="destructive" className="text-[10px] py-0 h-4">
                            خرق SLA
                          </Badge>
                        )}
                        {c.priority === 'urgent' && (
                          <Badge variant="destructive" className="text-[10px] py-0 h-4">
                            عاجل
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Messages panel */}
        <section className={`${selectedId ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col overflow-hidden bg-muted/10`}>
          {!selected ? (
            <div className="flex-1 flex items-center justify-center text-center p-6">
              <div>
                <MessageCircle className="h-14 w-14 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">اختر محادثة لعرض الرسائل</p>
              </div>
            </div>
          ) : (
            <>
              {/* Conversation header */}
              <div className="px-4 py-3 border-b bg-card flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <Button className="md:hidden" variant="ghost" size="sm" onClick={() => setSelectedId(null)}>رجوع</Button>
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold">{selected.phone_number}</div>
                    {selected.customer?.name && (
                      <div className="text-xs text-muted-foreground">
                        {selected.customer.name}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {isQueuedConversation(selected) && canWork && <Button size="sm" disabled={!employee || claim.isPending} onClick={() => pickup(selected.id)}>استلام</Button>}
                  <Button variant="outline" size="sm" onClick={() => setShowDetails(v => !v)}>ملف العميل</Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link to={`/whatsapp-inbox/${selected.id}`}>
                      <ExternalLink className="h-3.5 w-3.5 me-1" />
                      تفاصيل وبحث
                    </Link>
                  </Button>
                  <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                    <span>الوارد</span>
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span>الصادر</span>
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                  </div>
                </div>
              </div>


              {/* Messages */}
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3 max-w-3xl mx-auto">
                  {messagesLoading ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      جاري تحميل الرسائل...
                    </div>
                  ) : messagesError ? (<p role="alert" className="text-destructive">تعذر تحميل الرسائل. أعد فتح المحادثة أو حدّث الصفحة.</p>) : !messages || messages.length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      لا توجد رسائل في هذه المحادثة
                    </div>
                  ) : (
                    messages.map((m: any) => {
                      const outbound = m.direction === 'outbound';
                      return (
                        <div
                          key={m.id}
                          className={`flex ${outbound ? 'justify-start' : 'justify-end'}`}
                        >
                          <Card
                            className={`max-w-[75%] shadow-sm border ${
                              outbound
                                ? 'bg-blue-500 text-white border-blue-500'
                                : 'bg-emerald-50 border-emerald-200'
                            }`}
                          >
                            <CardContent className="p-3 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] opacity-80">
                                {outbound ? (
                                  <>
                                    <ArrowUpRight className="h-3 w-3" />
                                    <span>صادر</span>
                                  </>
                                ) : (
                                  <>
                                    <ArrowDownLeft className="h-3 w-3 text-emerald-700" />
                                    <span className="text-emerald-700">وارد</span>
                                  </>
                                )}
                              </div>
                              <WhatsAppMediaMessage message={m} outbound={outbound} />
                              <div
                                className={`flex items-center justify-between gap-2 text-[10px] pt-1 ${
                                  outbound ? 'text-blue-100' : 'text-emerald-800/70'
                                }`}
                              >
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {format(new Date(m.sent_at), 'yyyy/MM/dd HH:mm')}
                                </span>
                                {outbound && (
                                  <span className="inline-flex items-center gap-0.5">
                                    {m.read_at ? (
                                      <><Check className="h-3 w-3" /><Check className="h-3 w-3 -ms-2 text-sky-200" /></>
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
                                <div className="text-[11px] bg-red-100 text-red-700 rounded p-1.5">
                                  {m.error_message}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>

              {/* Composer */}
              <div className="border-t bg-card p-3">
                {canWork && (selected.assigned_to === employee?.id || hasPermission('whatsapp_admin')) ? <WhatsAppMessageComposer
                  conversationId={selected.id}
                  prefillText={prefillText}
                  prefillNonce={prefillNonce}
                  onMessageSent={() => {}}
                /> : <p className="text-sm text-muted-foreground">{selected.assigned_to ? 'المحادثة مسندة لموظف آخر؛ اطلب التحويل من المشرف.' : 'استلم المحادثة أولًا للرد وإيقاف البوت.'}</p>}
              </div>
            </>
          )}
        </section>
        {selected && showDetails && <aside className="absolute inset-0 z-20 bg-background md:static md:w-[350px] md:shrink-0 border-r overflow-y-auto">
          <Button variant="ghost" className="m-2" onClick={() => setShowDetails(false)}>إغلاق التفاصيل</Button>
          <ConversationRightPanel conversationId={selected.id} conversation={selected}
            onInsertText={text => { setPrefillText(text); setPrefillNonce(n => n + 1); setShowDetails(false); }} />
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
