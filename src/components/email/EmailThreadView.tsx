import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Hand, LogOut, CheckCheck, Paperclip, User, Mail, MailOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { EmailThread, useEmailMessages } from '@/hooks/useEmail';
import { EmailComposer } from './EmailComposer';

const db = supabase as any;

function HtmlBody({ html }: { html: string }) {
  return <iframe title="email" sandbox="" srcDoc={`<base target="_blank"><style>body{font-family:sans-serif;font-size:14px;margin:0;word-wrap:break-word}img{max-width:100%}</style>${html}`} className="w-full min-h-[200px] h-[360px] rounded-md bg-background border-0" />;
}

async function openAttachment(path: string) {
  const { data, error } = await supabase.storage.from('email-attachments').createSignedUrl(path, 300);
  if (error) toast.error('تعذر فتح المرفق'); else window.open(data.signedUrl, '_blank', 'noopener');
}

interface Props { thread: EmailThread; userId: string; ownerName?: string | null; isSupervisor: boolean }

export function EmailThreadView({ thread, userId, ownerName, isSupervisor }: Props) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const { data: messages = [], isLoading } = useEmailMessages(thread.id);
  const mine = thread.assigned_to === userId;
  const refresh = () => { qc.invalidateQueries({ queryKey: ['email-threads', orgId] }); qc.invalidateQueries({ queryKey: ['email-messages', thread.id] }); };

  useEffect(() => {
    if (thread.marked_unread || !thread.last_read_at || (thread.last_inbound_at && thread.last_inbound_at > thread.last_read_at)) {
      db.from('email_threads').update({ last_read_at: new Date().toISOString(), marked_unread: false }).eq('id', thread.id).then(refresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id]);

  const rpc = async (fn: string, args: any, ok: string) => {
    const { error } = await db.rpc(fn, args);
    if (error) toast.error(error.message.includes('already') ? 'موظف تاني استلم المحادثة' : error.message); else { toast.success(ok); refresh(); }
  };
  const markUnread = async () => { await db.from('email_threads').update({ marked_unread: true }).eq('id', thread.id); refresh(); };

  const last = messages[messages.length - 1];
  const reSubject = (thread.subject || '').match(/^\s*re:/i) ? thread.subject! : `Re: ${thread.subject || ''}`;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{thread.subject || '(بدون عنوان)'}</h2>
          <div className="text-sm text-foreground">{thread.contact_name || thread.contact_email}</div>
          <div className="text-xs text-muted-foreground" dir="ltr">{thread.contact_email}</div>
        </div>
        {thread.customer_id && <Button asChild size="sm" variant="outline"><Link to={`/customers/${thread.customer_id}`}><User className="h-4 w-4 ml-1" />ملف العميل</Link></Button>}
        <Button size="sm" variant="ghost" onClick={markUnread}><Mail className="h-4 w-4 ml-1" />غير مقروء</Button>
        {!thread.assigned_to && <Button size="sm" onClick={() => rpc('claim_email_thread', { _thread: thread.id }, 'استلمت المحادثة')}><Hand className="h-4 w-4 ml-1" />استلام</Button>}
        {thread.assigned_to && !mine && <Badge variant="secondary">يتولاها: {ownerName || 'موظف آخر'}</Badge>}
        {(mine || (thread.assigned_to && isSupervisor)) && <>
          <Button size="sm" variant="outline" onClick={() => rpc('release_email_thread', { _thread: thread.id, _close: false }, 'رجعت للطابور')}><LogOut className="h-4 w-4 ml-1" />إرجاع للطابور</Button>
          <Button size="sm" variant="outline" onClick={() => rpc('release_email_thread', { _thread: thread.id, _close: true }, 'تم إنهاء المحادثة')}><CheckCheck className="h-4 w-4 ml-1" />إنهاء</Button>
        </>}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4">
        {isLoading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />}
        {messages.map((m) => (
          <article key={m.id} className={`rounded-xl border border-border p-4 shadow-sm ${m.direction === 'outbound' ? 'bg-primary/5 mr-8' : 'bg-card ml-8'}`}>
            <header className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span><span className="font-medium text-foreground">{m.direction === 'outbound' ? 'فريقنا' : (m.from_name || m.from_email)}</span>{' '}<span dir="ltr">&lt;{m.from_email}&gt;</span></span>
              <time>{new Date(m.sent_at).toLocaleString('ar-EG')}</time>
            </header>
            {m.body_html ? <HtmlBody html={m.body_html} /> : <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.body_text}</div>}
            {!!m.email_attachments?.length && (
              <div className="mt-3 flex flex-wrap gap-2">
                {m.email_attachments.map((a) => (
                  <button key={a.id} onClick={() => openAttachment(a.storage_path)} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-accent">
                    <Paperclip className="h-3 w-3" />{a.file_name}
                  </button>
                ))}
              </div>
            )}
          </article>
        ))}
        {!isLoading && !messages.length && <p className="text-center text-sm text-muted-foreground"><MailOpen className="mx-auto mb-2 h-6 w-6" />لا توجد رسائل</p>}
      </div>

      <EmailComposer
        key={thread.id}
        threadId={thread.id}
        defaultTo={last?.direction === 'inbound' ? (last.from_email || thread.contact_email) : thread.contact_email}
        defaultSubject={reSubject}
        compact
        disabled={!mine}
        disabledReason={thread.assigned_to ? 'المحادثة مستلمة باسم موظف آخر' : 'اضغط «استلام» عشان تقدر ترد'}
        onSent={refresh}
      />
    </div>
  );
}
