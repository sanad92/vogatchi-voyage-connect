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

const WhatsAppInboxContent: React.FC = () => {
  const { conversations, conversationsLoading } = useWhatsApp();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const list = conversations || [];
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter((c: any) =>
      (c.phone_number || '').toLowerCase().includes(q) ||
      (c.customer?.name || '').toLowerCase().includes(q)
    );
  }, [conversations, search]);

  // Auto-select first conversation
  React.useEffect(() => {
    if (!selectedId && filtered.length > 0) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((c: any) => c.id === selectedId);
  const { messages, isLoading: messagesLoading } = useWhatsAppMessages(selectedId || undefined);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center gap-3">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">صندوق رسائل واتساب</h1>
        <Badge variant="secondary" className="ms-auto">
          {conversations?.length || 0} محادثة
        </Badge>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-[340px,1fr] overflow-hidden">
        {/* Conversations list */}
        <aside className="border-l bg-muted/20 flex flex-col overflow-hidden">
          <div className="p-3 border-b bg-card">
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
              ) : filtered.length === 0 ? (
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
                            ? `آخر مزامنة ${formatDistanceToNow(new Date(c.last_inbound_at), { addSuffix: true, locale: ar })}`
                            : 'لا يوجد استلام بعد'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Badge variant="outline" className="text-[10px] py-0 h-4">
                          {c.status === 'active'
                            ? 'نشط'
                            : c.status === 'pending'
                            ? 'انتظار'
                            : c.status === 'closed'
                            ? 'مغلق'
                            : c.status}
                        </Badge>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Messages panel */}
        <section className="flex flex-col overflow-hidden bg-muted/10">
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
                <div className="flex items-center gap-3">
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
                <div className="flex items-center gap-2">
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
                  ) : !messages || messages.length === 0 ? (
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
                <WhatsAppMessageComposer
                  conversationId={selected.id}
                  onMessageSent={() => {}}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

const WhatsAppInbox: React.FC = () => (
  <OptimizedErrorBoundary>
    <PermissionGate
      requiredRole="viewer"
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">لا تملك صلاحية عرض محادثات واتساب</p>
        </div>
      }
    >
      <WhatsAppInboxContent />
    </PermissionGate>
  </OptimizedErrorBoundary>
);

export default WhatsAppInbox;
