import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Phone, RefreshCw, Sparkles } from 'lucide-react';
import { useCustomerWhatsApp } from '@/hooks/useCustomerWhatsApp';
import { useWhatsAppMessaging } from '@/hooks/useWhatsAppMessaging';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';

interface Props {
  customerId: string;
  customerPhone?: string | null;
  customerName?: string;
}

const statusBadge = (status?: string) => {
  switch (status) {
    case 'read':
      return <Badge variant="secondary" className="text-[10px] px-1.5">تمت القراءة</Badge>;
    case 'delivered':
      return <Badge variant="outline" className="text-[10px] px-1.5">تم التسليم</Badge>;
    case 'failed':
      return <Badge variant="destructive" className="text-[10px] px-1.5">فشل</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px] px-1.5">مرسلة</Badge>;
  }
};

export const CustomerWhatsAppChat: React.FC<Props> = ({ customerId, customerPhone, customerName }) => {
  const { conversation, conversationId, messages, isLoading, hasPhone, createConversation, refetch } =
    useCustomerWhatsApp(customerId, customerPhone);
  const { sendTextMessage, isSending } = useWhatsAppMessaging();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    if (!conversationId) {
      toast.error('لا توجد محادثة نشطة');
      return;
    }
    const text = draft.trim();
    if (!text) return;
    try {
      await sendTextMessage(conversationId, text);
      setDraft('');
    } catch {
      // toast handled in hook
    }
  };

  const handleStartConversation = async () => {
    try {
      await createConversation();
      toast.success('تم إنشاء محادثة WhatsApp جديدة');
    } catch (e: any) {
      toast.error(e?.message || 'تعذر إنشاء المحادثة');
    }
  };

  if (!hasPhone) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>أضف رقم هاتف للعميل لتفعيل محادثات WhatsApp.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b py-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-base">
            <MessageCircle className="h-5 w-5 text-green-600" />
            <span>محادثة WhatsApp</span>
            {customerPhone && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground font-normal">
                <Phone className="h-3 w-3" />
                {customerPhone}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {conversation?.status && (
              <Badge variant="outline" className="text-xs">
                {conversation.status === 'active' ? 'نشطة' : conversation.status}
              </Badge>
            )}
            <Button variant="ghost" size="icon" onClick={refetch} title="تحديث">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : !conversationId ? (
          <div className="text-center py-10">
            <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground mb-4">
              لا توجد محادثة WhatsApp لـ {customerName || 'هذا العميل'} بعد.
            </p>
            <Button onClick={handleStartConversation} size="sm">
              بدء محادثة جديدة
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            لم يتم تبادل أي رسائل بعد. ابدأ المحادثة بإرسال رسالة أدناه.
          </p>
        ) : (
          messages.map((m: any) => {
            const outbound = m.direction === 'outbound';
            return (
              <div key={m.id} className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                    outbound
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-card border rounded-bl-sm'
                  }`}
                >
                  {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                  {m.media_url && (
                    <a
                      href={m.media_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline mt-1 inline-block"
                    >
                      عرض المرفق
                    </a>
                  )}
                  <div
                    className={`flex items-center gap-2 mt-1 text-[10px] ${
                      outbound ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground'
                    }`}
                  >
                    <span>
                      {formatDistanceToNow(new Date(m.sent_at || m.created_at), {
                        addSuffix: true,
                        locale: ar,
                      })}
                    </span>
                    {outbound && statusBadge(m.status)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </CardContent>

      {/* Composer */}
      {conversationId && (
        <div className="border-t p-3 bg-background">
          <div className="flex gap-2">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="اكتب رسالة... (Enter للإرسال، Shift+Enter لسطر جديد)"
              className="min-h-[44px] max-h-32 resize-none"
              disabled={isSending}
            />
            <Button onClick={handleSend} disabled={isSending || !draft.trim()} size="icon" className="h-auto">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CustomerWhatsAppChat;
