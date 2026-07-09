import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Image as ImageIcon, X, FileText } from 'lucide-react';
import { useWhatsAppMessaging } from '@/hooks/useWhatsAppMessaging';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { QuickRepliesPicker } from './QuickRepliesPicker';
import { TemplatesPicker } from './TemplatesPicker';
import type { VariableContext } from '@/lib/whatsappVariables';
import { toast } from 'sonner';

interface Props {
  conversationId: string;
  onMessageSent?: () => void;
  prefillText?: string;
  prefillNonce?: number;
  contactName?: string | null;
  contactPhone?: string | null;
}

const MAX_MB = 16;

export const WhatsAppMessageComposer: React.FC<Props> = ({
  conversationId,
  onMessageSent,
  prefillText,
  prefillNonce,
  contactName,
  contactPhone,
}) => {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<{ file: File; preview?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { user } = useOptimizedAuth() as any;
  const { data: currentOrg } = useCurrentOrganization() as any;

  useEffect(() => {
    if (prefillText !== undefined && prefillNonce !== undefined) {
      setMessage(prefillText);
    }
  }, [prefillText, prefillNonce]);

  const { sendTextMessage, sendMedia, isSending } = useWhatsAppMessaging();

  const variables: VariableContext = {
    customer_name: contactName || null,
    customer_phone: contactPhone || null,
    agent_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || null,
    organization_name: currentOrg?.name || null,
  };

  const handlePickFile = (accept: string, ref: React.RefObject<HTMLInputElement>) => {
    if (ref.current) {
      ref.current.accept = accept;
      ref.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`الحد الأقصى ${MAX_MB} ميجابايت`);
      return;
    }
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined;
    setPending({ file, preview });
  };

  const clearPending = () => {
    if (pending?.preview) URL.revokeObjectURL(pending.preview);
    setPending(null);
  };

  const handleSend = async () => {
    try {
      if (pending) {
        await sendMedia(conversationId, pending.file, message.trim() || undefined);
        clearPending();
        setMessage('');
        onMessageSent?.();
        return;
      }
      if (!message.trim()) {
        toast.error('يرجى كتابة رسالة');
        return;
      }
      await sendTextMessage(conversationId, message);
      setMessage('');
      onMessageSent?.();
    } catch (err) {
      console.error('send failed:', err);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} />
      <input ref={imageInputRef} type="file" hidden onChange={handleFileChange} />

      {showQuickReplies && quickReplies && quickReplies.length > 0 && (
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium">الردود السريعة</h4>
              <Button variant="ghost" size="sm" onClick={() => setShowQuickReplies(false)}>إغلاق</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {quickReplies.map((r) => (
                <Button
                  key={r.id}
                  variant="outline"
                  size="sm"
                  className="text-xs justify-start"
                  onClick={() => { setMessage(r.content); setShowQuickReplies(false); }}
                >
                  {r.title}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {pending && (
        <div className="flex items-center gap-3 p-2 border rounded-md bg-muted/40">
          {pending.preview ? (
            <img src={pending.preview} alt="preview" className="h-14 w-14 object-cover rounded" />
          ) : (
            <div className="h-14 w-14 rounded bg-background border flex items-center justify-center">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate">{pending.file.name}</div>
            <div className="text-[10px] text-muted-foreground">{(pending.file.size / 1024).toFixed(1)} KB</div>
          </div>
          <Button variant="ghost" size="icon" onClick={clearPending}><X className="h-4 w-4" /></Button>
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={pending ? 'اكتب تعليقاً (اختياري)...' : 'اكتب رسالتك هنا...'}
            className="min-h-[70px] resize-none"
            disabled={isSending}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-1">
            <Button variant="outline" size="sm" title="الردود السريعة" onClick={() => setShowQuickReplies((v) => !v)}>
              <Zap className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              title="إرفاق صورة"
              onClick={() => handlePickFile('image/*', imageInputRef)}
              disabled={isSending}
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              title="إرفاق ملف / صوت / فيديو"
              onClick={() => handlePickFile('audio/*,video/*,application/*', fileInputRef)}
              disabled={isSending}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={handleSend}
            disabled={(!message.trim() && !pending) || isSending}
            className="h-full min-h-[70px]"
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
