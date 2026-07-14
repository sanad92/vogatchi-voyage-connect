import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, Paperclip, Image as ImageIcon, X, FileText } from 'lucide-react';
import { useWhatsAppMessaging } from '@/hooks/useWhatsAppMessaging';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { useWhatsAppWindow } from '@/hooks/useWhatsAppWindow';
import { QuickRepliesPicker } from './QuickRepliesPicker';
import { TemplatesPicker } from './TemplatesPicker';
import { WindowStatusBadge } from './WindowStatusBadge';
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
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { user } = useOptimizedAuth() as any;
  const { data: currentOrg } = useCurrentOrganization() as any;

  const windowState = useWhatsAppWindow(conversationId);
  const { isWindowOpen, contextVars } = windowState;

  useEffect(() => {
    if (prefillText !== undefined && prefillNonce !== undefined) {
      setMessage(prefillText);
    }
  }, [prefillText, prefillNonce]);

  const { sendTextMessage, sendMedia, sendTemplate, isSending } = useWhatsAppMessaging();

  const variables: VariableContext = {
    customer_name: contextVars.customer_name || contactName || null,
    customer_phone: contextVars.customer_phone || contactPhone || null,
    agent_name: user?.user_metadata?.full_name || user?.email?.split('@')[0] || null,
    organization_name: currentOrg?.name || null,
    booking_reference: contextVars.booking_reference || null,
    booking_destination: contextVars.booking_destination || null,
    booking_check_in: contextVars.booking_check_in || null,
    booking_check_out: contextVars.booking_check_out || null,
    invoice_number: contextVars.invoice_number || null,
    invoice_total: contextVars.invoice_total || null,
    invoice_currency: contextVars.invoice_currency || null,
  };

  const handlePickFile = (accept: string, ref: React.RefObject<HTMLInputElement>) => {
    if (!isWindowOpen) {
      toast.error('نافذة 24 ساعة مغلقة — استخدم قالباً معتمداً بدلاً من إرسال ملفات');
      setTemplatePickerOpen(true);
      return;
    }
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
    // Intercept BEFORE any Meta request when the 24h window is closed.
    if (!isWindowOpen) {
      toast.warning('نافذة 24 ساعة مغلقة — اختر قالباً معتمداً لإكمال الإرسال', {
        description: 'وفقاً لسياسة Meta لا يمكن إرسال رسائل حرة بعد مرور 24 ساعة على آخر رسالة من العميل.',
      });
      setTemplatePickerOpen(true);
      return;
    }

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

  const handleDirectTemplateSend = async (payload: {
    templateName: string;
    templateLanguage: string;
    templateParameters: string[];
    previewText: string;
  }) => {
    try {
      await sendTemplate(
        conversationId,
        payload.templateName,
        payload.templateParameters,
        payload.templateLanguage,
      );
      setMessage('');
      clearPending();
      onMessageSent?.();
    } catch (err) {
      console.error('template send failed:', err);
    }
  };

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" hidden onChange={handleFileChange} />
      <input ref={imageInputRef} type="file" hidden onChange={handleFileChange} />

      <div className="flex items-center justify-between gap-2">
        <WindowStatusBadge state={windowState} />
        {!isWindowOpen && (
          <TemplatesPicker
            variables={variables}
            onPick={() => {}}
            open={templatePickerOpen}
            onOpenChange={setTemplatePickerOpen}
            approvedOnly
            onSendDirect={handleDirectTemplateSend}
            triggerNode={
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px] border-amber-300 text-amber-800 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300"
              >
                <FileText className="w-3 h-3 ml-1" />
                اختر قالباً
              </Button>
            }
          />
        )}
      </div>

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
            placeholder={
              !isWindowOpen
                ? 'نافذة 24 ساعة مغلقة — استخدم قالباً معتمداً'
                : pending
                  ? 'اكتب تعليقاً (اختياري)...'
                  : 'اكتب رسالتك هنا...'
            }
            className="min-h-[70px] resize-none"
            disabled={isSending || !isWindowOpen}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex gap-1">
            <QuickRepliesPicker variables={variables} onPick={(t) => setMessage(t)} />
            {/* Freeform template pick (window open) */}
            {isWindowOpen && (
              <TemplatesPicker variables={variables} onPick={(t) => setMessage(t)} />
            )}
            <Button
              variant="outline"
              size="sm"
              title={isWindowOpen ? 'إرفاق صورة' : 'مغلق — استخدم قالباً'}
              onClick={() => handlePickFile('image/*', imageInputRef)}
              disabled={isSending}
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              title={isWindowOpen ? 'إرفاق ملف / صوت / فيديو' : 'مغلق — استخدم قالباً'}
              onClick={() => handlePickFile('audio/*,video/*,application/*', fileInputRef)}
              disabled={isSending}
            >
              <Paperclip className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={handleSend}
            disabled={isSending || (isWindowOpen && !message.trim() && !pending)}
            className="h-full min-h-[70px]"
            variant={isWindowOpen ? 'default' : 'secondary'}
          >
            {isSending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : isWindowOpen ? (
              <Send className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Hidden template picker used in closed-window mode; direct-send on click. */}
      <div className="hidden">
        <TemplatesPicker
          variables={variables}
          onPick={() => {}}
          open={templatePickerOpen}
          onOpenChange={setTemplatePickerOpen}
          approvedOnly
          onSendDirect={handleDirectTemplateSend}
          hideTrigger
        />
      </div>
    </div>
  );
};
