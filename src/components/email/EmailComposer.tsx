import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Send, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { invokeEmailFn } from '@/hooks/useEmail';

const MAX_TOTAL = 10 * 1024 * 1024;
const toB64 = (file: File) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = rej; r.readAsDataURL(file);
});
const splitEmails = (s: string) => s.split(/[,;\s]+/).map((x) => x.trim()).filter(Boolean);

interface Props {
  threadId?: string; accountId?: string; defaultTo?: string; defaultSubject?: string;
  disabled?: boolean; disabledReason?: string; onSent?: (threadId: string) => void; compact?: boolean;
}

export function EmailComposer({ threadId, accountId, defaultTo = '', defaultSubject = '', disabled, disabledReason, onSent, compact }: Props) {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [text, setText] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const lock = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const send = async () => {
    if (lock.current || disabled) return;
    const toList = splitEmails(to);
    if (!toList.length || !subject.trim() || !text.trim()) { toast.error('أكمل المرسل إليه والموضوع والرسالة'); return; }
    const total = files.reduce((s, f) => s + f.size, 0);
    if (total > MAX_TOTAL) { toast.error('حجم المرفقات أكبر من 10 ميجا'); return; }
    lock.current = true; setSending(true);
    try {
      const attachments = await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type || 'application/octet-stream', base64: await toB64(f) })));
      const r = await invokeEmailFn('email-send', { threadId, accountId, to: toList, cc: splitEmails(cc), subject: subject.trim(), text, attachments });
      toast.success('تم إرسال البريد');
      setText(''); setFiles([]); if (!threadId) setCc('');
      onSent?.(r.threadId);
    } catch (e: any) { toast.error(e.message); } finally { lock.current = false; setSending(false); }
  };

  if (disabled) return <div className="border-t border-border p-4 text-center text-sm text-muted-foreground">{disabledReason}</div>;

  return (
    <div className="border-t border-border bg-card p-3 space-y-2">
      {!compact && <>
        <Input dir="ltr" placeholder="إلى: client@example.com" value={to} onChange={(e) => setTo(e.target.value)} />
        <Input dir="ltr" placeholder="نسخة (CC)" value={cc} onChange={(e) => setCc(e.target.value)} />
        <Input placeholder="الموضوع" value={subject} onChange={(e) => setSubject(e.target.value)} />
      </>}
      <Textarea rows={compact ? 3 : 8} placeholder="اكتب ردّك…" value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); } }} readOnly={sending} />
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
              {f.name}<button onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label="إزالة"><X className="h-3 w-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <input ref={fileRef} type="file" multiple hidden onChange={(e) => { setFiles([...files, ...Array.from(e.target.files || [])]); e.target.value = ''; }} />
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()}><Paperclip className="h-4 w-4 ml-1" />مرفق</Button>
        </div>
        <Button onClick={send} disabled={sending}>{sending ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <Send className="h-4 w-4 ml-2" />}إرسال</Button>
      </div>
    </div>
  );
}
