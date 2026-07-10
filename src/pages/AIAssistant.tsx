import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Plus, Send, Trash2, Sparkles, MessageSquare, PinIcon } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';

interface Thread {
  id: string; title: string; pinned: boolean; updated_at: string;
}
interface Msg {
  id: string; role: string; content: string | null; created_at: string;
  tool_name?: string | null; tool_calls?: any;
}

const SUGGESTIONS = [
  'ما هو الوضع المالي هذا الشهر؟',
  'أعطني قائمة أعلى 5 عملاء ربحية هذا الشهر',
  'ما هي الفواتير المتأخرة أكثر من 30 يومًا؟',
  'ما إجمالي مستحقات الموردين حالياً؟',
];

const AIAssistant = () => {
  const nav = useNavigate();
  const { threadId } = useParams();
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();
  const { userRole } = useSupabasePermissions();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const allowed = ['owner', 'admin', 'manager'].includes(userRole || '');

  const loadThreads = async () => {
    if (!orgId) return;
    const { data } = await (supabase as any)
      .from('ai_assistant_threads').select('id, title, pinned, updated_at')
      .eq('organization_id', orgId).order('pinned', { ascending: false }).order('updated_at', { ascending: false });
    setThreads(data || []);
    if (!threadId && data && data.length > 0) nav(`/ai-assistant/${data[0].id}`, { replace: true });
  };

  const loadMessages = async (id: string) => {
    setLoadingMsgs(true);
    const { data } = await (supabase as any)
      .from('ai_assistant_messages').select('*').eq('thread_id', id).order('created_at', { ascending: true });
    setMessages(data || []);
    setLoadingMsgs(false);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }), 100);
  };

  useEffect(() => { loadThreads(); }, [orgId]);
  useEffect(() => {
    if (threadId) loadMessages(threadId);
    else setMessages([]);
    inputRef.current?.focus();
  }, [threadId]);

  const newThread = async () => {
    if (!orgId || !user) return;
    const { data, error } = await (supabase as any).from('ai_assistant_threads')
      .insert({ organization_id: orgId, user_id: user.id, title: 'محادثة جديدة' })
      .select().single();
    if (error) { toast.error(error.message); return; }
    await loadThreads();
    nav(`/ai-assistant/${data.id}`);
  };

  const deleteThread = async (id: string) => {
    if (!confirm('حذف هذه المحادثة نهائياً؟')) return;
    const { error } = await (supabase as any).from('ai_assistant_threads').delete().eq('id', id);
    if (error) return toast.error(error.message);
    if (threadId === id) nav('/ai-assistant');
    loadThreads();
  };

  const togglePin = async (t: Thread) => {
    await (supabase as any).from('ai_assistant_threads').update({ pinned: !t.pinned }).eq('id', t.id);
    loadThreads();
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || sending || !orgId) return;
    let id = threadId;
    if (!id) {
      const { data } = await (supabase as any).from('ai_assistant_threads')
        .insert({ organization_id: orgId, user_id: user!.id, title: content.slice(0, 60) })
        .select().single();
      id = data.id;
      nav(`/ai-assistant/${id}`);
      await new Promise(r => setTimeout(r, 100));
    } else if (messages.length === 0) {
      // First message → set title
      await (supabase as any).from('ai_assistant_threads').update({ title: content.slice(0, 60) }).eq('id', id);
    }

    setInput('');
    setSending(true);
    // Optimistic
    setMessages(m => [...m, { id: crypto.randomUUID(), role: 'user', content, created_at: new Date().toISOString() }]);
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current!.scrollHeight, behavior: 'smooth' }), 50);

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant-chat', {
        body: { thread_id: id, organization_id: orgId, user_message: content },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'خطأ غير معروف');
      await loadMessages(id!);
      loadThreads();
    } catch (e: any) {
      toast.error(e.message || 'فشل الإرسال');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  if (!allowed) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold mb-2">هذه الميزة متاحة للإدارة فقط</h2>
        <p className="text-muted-foreground text-sm">المساعد الذكي محصور على الأدوار: مالك، أدمن، مدير.</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-3 p-3">
      {/* Threads sidebar */}
      <Card className="w-64 shrink-0 flex flex-col">
        <div className="p-3 border-b">
          <Button onClick={newThread} className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" /> محادثة جديدة
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {threads.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">لا توجد محادثات بعد</p>
            )}
            {threads.map(t => (
              <div key={t.id}
                className={`group flex items-center gap-1 rounded-md px-2 py-2 text-sm cursor-pointer hover:bg-muted/60 ${threadId === t.id ? 'bg-muted' : ''}`}
                onClick={() => nav(`/ai-assistant/${t.id}`)}>
                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">{t.title}</span>
                <button onClick={(e) => { e.stopPropagation(); togglePin(t); }}
                  className="opacity-0 group-hover:opacity-100 transition p-0.5">
                  <PinIcon className={`h-3 w-3 ${t.pinned ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); deleteThread(t.id); }}
                  className="opacity-0 group-hover:opacity-100 transition p-0.5 text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat */}
      <Card className="flex-1 flex flex-col overflow-hidden">
        <div className="p-3 border-b flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold">Vogatchi AI</div>
            <div className="text-[10px] text-muted-foreground">مساعد مالي وتشغيلي — يقرأ بياناتك الفعلية</div>
          </div>
        </div>

        <ScrollArea className="flex-1" ref={scrollRef as any}>
          <div className="p-4 space-y-4 max-w-3xl mx-auto">
            {messages.length === 0 && !loadingMsgs && (
              <div className="text-center py-16 space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">كيف يمكنني مساعدتك اليوم؟</h3>
                  <p className="text-xs text-muted-foreground mt-1">اسأل عن أي شيء في بياناتك المالية والتشغيلية</p>
                </div>
                <div className="grid grid-cols-2 gap-2 max-w-lg mx-auto pt-4">
                  {SUGGESTIONS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      className="text-right p-3 rounded-lg border border-border/60 hover:border-primary/40 hover:bg-muted/40 transition text-xs">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.filter(m => m.role === 'user' || (m.role === 'assistant' && m.content)).map(m => (
              <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/60'
                }`}>
                  {m.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-ul:my-1 prose-table:my-2">
                      <ReactMarkdown>{m.content || ''}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  )}
                  <div className="text-[10px] opacity-60 mt-1">
                    {formatDistanceToNow(new Date(m.created_at), { addSuffix: true, locale: ar })}
                  </div>
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="bg-muted/60 rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-muted-foreground">يفكر...</span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="border-t p-3">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
              placeholder="اسأل عن أي شيء في بياناتك..."
              rows={2}
              disabled={sending}
              className="resize-none text-sm"
            />
            <Button onClick={() => send()} disabled={sending || !input.trim()} size="icon" className="h-auto">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            المساعد يحترم صلاحياتك — لن يرى بيانات خارج مؤسستك
          </p>
        </div>
      </Card>
    </div>
  );
};

export default AIAssistant;
