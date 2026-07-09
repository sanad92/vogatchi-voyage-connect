import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  ArrowRight,
  Phone,
  User as UserIcon,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  MessageCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { WhatsAppMessageComposer } from '@/components/whatsapp/WhatsAppMessageComposer';
import { WhatsAppMediaMessage } from '@/components/whatsapp/WhatsAppMediaMessage';
import { ConversationRightPanel } from '@/components/whatsapp/ConversationRightPanel';
import { PermissionGate } from '@/components/auth/PermissionGate';
import OptimizedErrorBoundary from '@/components/common/OptimizedErrorBoundary';
import { format } from 'date-fns';

const highlight = (text: string, term: string) => {
  if (!term.trim()) return text;
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return parts.map((p, i) =>
    p.toLowerCase() === term.toLowerCase() ? (
      <mark key={i} className="bg-yellow-300/70 rounded px-0.5">
        {p}
      </mark>
    ) : (
      <React.Fragment key={i}>{p}</React.Fragment>
    )
  );
};

const WhatsAppConversationDetailContent: React.FC = () => {
  const { conversationId = '' } = useParams();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [directionFilter, setDirectionFilter] = useState<'all' | 'inbound' | 'outbound'>('all');

  const { data: conversation, isLoading: convLoading } = useQuery({
    queryKey: ['whatsapp-conversation-detail', conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversations')
        .select(`
          *,
          customer:customers(id, name, email, phone),
          assigned_employee:employees(full_name, employee_code)
        `)
        .eq('id', conversationId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!conversationId,
  });

  const { messages, isLoading: messagesLoading } = useWhatsAppMessages(conversationId);

  // Enrich with sender profile names (batch lookup, no FK required)
  const senderIds = useMemo(() => {
    return Array.from(new Set((messages || []).map((m: any) => m.sent_by).filter(Boolean)));
  }, [messages]);

  const { data: senders } = useQuery({
    queryKey: ['whatsapp-message-senders', conversationId, senderIds.join(',')],
    queryFn: async () => {
      if (senderIds.length === 0) return {} as Record<string, string>;
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', senderIds as string[]);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => {
        map[p.id] = p.full_name || p.email || 'مستخدم';
      });
      return map;
    },
    enabled: senderIds.length > 0,
  });

  const filtered = useMemo(() => {
    const list = messages || [];
    const q = search.trim().toLowerCase();
    return list.filter((m: any) => {
      if (directionFilter !== 'all' && m.direction !== directionFilter) return false;
      if (!q) return true;
      return (m.content || '').toLowerCase().includes(q) ||
        (m.template_name || '').toLowerCase().includes(q);
    });
  }, [messages, search, directionFilter]);

  const stats = useMemo(() => {
    const list = messages || [];
    return {
      total: list.length,
      inbound: list.filter((m: any) => m.direction === 'inbound').length,
      outbound: list.filter((m: any) => m.direction === 'outbound').length,
    };
  }, [messages]);

  if (convLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center">
        <div>
          <MessageCircle className="h-14 w-14 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">المحادثة غير موجودة</p>
          <Button onClick={() => navigate('/whatsapp-inbox')}>عودة إلى الصندوق</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex bg-background" dir="rtl">
      <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="border-b bg-card px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/whatsapp-inbox" aria-label="عودة">
            <ArrowRight className="h-5 w-5" />
          </Link>
        </Button>
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <Phone className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{conversation.phone_number}</div>
          {conversation.customer ? (
            <Link
              to={`/customers/${conversation.customer.id}`}
              className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
            >
              <UserIcon className="h-3 w-3" />
              {conversation.customer.name}
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">عميل غير مرتبط</span>
          )}
        </div>
        <div className="ms-auto flex items-center gap-2">
          <Badge variant="outline">{stats.total} رسالة</Badge>
          <Badge variant="secondary">
            <ArrowDownLeft className="h-3 w-3 me-1" /> {stats.inbound}
          </Badge>
          <Badge className="bg-blue-500 hover:bg-blue-500">
            <ArrowUpRight className="h-3 w-3 me-1" /> {stats.outbound}
          </Badge>
        </div>
      </div>

      {/* Search & filters */}
      <div className="border-b bg-card px-4 py-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث داخل الرسائل..."
            className="pr-9"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="مسح البحث"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex gap-1">
          {(['all', 'inbound', 'outbound'] as const).map((v) => (
            <Button
              key={v}
              size="sm"
              variant={directionFilter === v ? 'default' : 'outline'}
              onClick={() => setDirectionFilter(v)}
            >
              {v === 'all' ? 'الكل' : v === 'inbound' ? 'الوارد' : 'الصادر'}
            </Button>
          ))}
        </div>
        {search && (
          <span className="text-xs text-muted-foreground">
            {filtered.length} نتيجة
          </span>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-muted/10">
        <div className="max-w-3xl mx-auto p-4 space-y-3">
          {messagesLoading ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              جاري تحميل الرسائل...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              {search ? 'لا توجد رسائل مطابقة للبحث' : 'لا توجد رسائل بعد'}
            </div>
          ) : (
            filtered.map((m: any) => {
              const outbound = m.direction === 'outbound';
              const senderName =
                (m.sent_by && senders?.[m.sent_by]) ||
                (outbound ? 'موظف' : conversation.customer?.name || conversation.phone_number);
              return (
                <div
                  key={m.id}
                  className={`flex ${outbound ? 'justify-start' : 'justify-end'}`}
                >
                  <Card
                    className={`max-w-[78%] shadow-sm border ${
                      outbound
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    <CardContent className="p-3 space-y-1.5">
                      <div
                        className={`flex items-center gap-1.5 text-[11px] ${
                          outbound ? 'text-blue-100' : 'text-emerald-800/80'
                        }`}
                      >
                        {outbound ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownLeft className="h-3 w-3" />
                        )}
                        <span className="font-medium">{senderName}</span>
                        <span className="opacity-70">•</span>
                        <span>{outbound ? 'صادر' : 'وارد'}</span>
                      </div>
                      {search ? (
                        <div className="whitespace-pre-wrap break-words text-sm">
                          {highlight(
                            m.content ||
                              m.media_caption ||
                              m.media_file_name ||
                              (m.template_name ? `[قالب: ${m.template_name}]` : '—'),
                            search
                          )}
                        </div>
                      ) : (
                        <WhatsAppMediaMessage message={m} outbound={outbound} />
                      )}
                      <div
                        className={`flex items-center justify-between gap-2 text-[10px] pt-1 ${
                          outbound ? 'text-blue-100' : 'text-emerald-800/70'
                        }`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {format(new Date(m.sent_at), 'yyyy/MM/dd HH:mm:ss')}
                        </span>
                        {outbound && (
                          <span className="uppercase tracking-wide">{m.status}</span>
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
        <WhatsAppMessageComposer conversationId={conversationId} onMessageSent={() => {}} />
      </div>
      </div>
      {/* Right panel */}
      <aside className="hidden lg:flex w-[340px] shrink-0">
        <ConversationRightPanel conversationId={conversationId} conversation={conversation} />
      </aside>
    </div>
  );
};

const WhatsAppConversationDetail: React.FC = () => (
  <OptimizedErrorBoundary>
    <PermissionGate
      requiredRole="viewer"
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-muted-foreground">لا تملك صلاحية عرض المحادثة</p>
        </div>
      }
    >
      <WhatsAppConversationDetailContent />
    </PermissionGate>
  </OptimizedErrorBoundary>
);

export default WhatsAppConversationDetail;
