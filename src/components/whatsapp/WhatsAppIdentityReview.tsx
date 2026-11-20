import { useEffect, useId, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { FileSearch, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { supabase } from '@/integrations/supabase/client';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { isIdentityAttachment, isIdentityImage, normalizeIdentityField } from '@/lib/whatsappIdentityDraft';

interface Props {
  organizationId: string;
  conversationId: string;
  messageId: string;
  path: string;
  mime: string;
  preview: string;
}

interface ReviewSource {
  storage_path: string;
  mime_type: string;
  customer: { id: string; name: string; nationality: string | null; updated_at: string | null } | null;
}

function IdentityReviewDialog({ organizationId, conversationId, messageId, path, mime, preview, close }: Props & { close: () => void }) {
  const key = useId();
  const queryClient = useQueryClient();
  const [source, setSource] = useState<ReviewSource | null>(null);
  const [name, setName] = useState('');
  const [nationality, setNationality] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState('');
  const lifetime = useRef<AbortController | null>(null);
  const lock = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;

    void callUntypedRpc<ReviewSource>('review_whatsapp_identity_attachment', {
      _organization: organizationId, _conversation: conversationId, _message: messageId,
    }).then(({ data, error }) => {
      if (controller.signal.aborted) return;
      if (error || !data || data.storage_path !== path || data.mime_type !== mime) {
        setFailure('تعذّر فتح مراجعة المستند أو لم تعد لك صلاحية على المحادثة.');
        return;
      }
      setSource(data);
      setName(data.customer?.name ?? '');
      setNationality(data.customer?.nationality ?? '');
    }, () => {
      if (!controller.signal.aborted) setFailure('تعذّر فتح مراجعة المستند.');
    });

    return () => controller.abort();
  }, [organizationId, conversationId, messageId, path, mime]);

  const customer = source?.customer;
  const nameChanged = name.trim() !== (customer?.name ?? '');
  const nationalityChanged = nationality.trim() !== (customer?.nationality ?? '');

  async function readPhoto() {
    if (!source || lock.current || !isIdentityImage(source.mime_type) || !lifetime.current) return;
    lock.current = true;
    const dialogSignal = lifetime.current.signal;
    const timeout = new AbortController();
    const stop = () => timeout.abort();
    const timer = window.setTimeout(stop, 40_000);
    dialogSignal.addEventListener('abort', stop, { once: true });
    const signal = timeout.signal;
    setOcrRunning(true);
    setConfirmed(false);
    setNotice('');
    setFailure('');
    try {
      const { data, error } = await supabase.storage.from('whatsapp-media')
        .download(source.storage_path, {}, { cache: 'no-store', signal });
      signal.throwIfAborted();
      if (error || !data || !data.size || data.size > 8_000_000) throw new Error('identity_image_unavailable');
      const { recognizeIdentityImage } = await import('@/lib/localIdentityOcr');
      const fields = await recognizeIdentityImage(data, signal);
      signal.throwIfAborted();
      if (fields.name) setName(fields.name);
      if (fields.nationality) setNationality(fields.nationality);
      setNotice(fields.name || fields.nationality
        ? 'دي بيانات مقترحة من الصورة. راجع الاسم والجنسية قبل الحفظ.'
        : 'ما قدرناش نحدد الاسم أو الجنسية. اقرأ البيانات من المستند واكتبها يدويًا.');
    } catch {
      if (!dialogSignal.aborted) setFailure('تعذّرت القراءة التلقائية. راجع المستند واكتب البيانات يدويًا.');
    } finally {
      window.clearTimeout(timer);
      dialogSignal.removeEventListener('abort', stop);
      lock.current = false;
      if (!dialogSignal.aborted) setOcrRunning(false);
    }
  }

  async function saveFields() {
    if (!source || !customer || !confirmed || lock.current || !lifetime.current) return;
    const nextName = nameChanged ? normalizeIdentityField(name, 120) : null;
    const nextNationality = nationalityChanged ? normalizeIdentityField(nationality, 70) : null;
    if ((nameChanged && !nextName) || (nationalityChanged && !nextNationality)) {
      setFailure('اكتب الاسم والجنسية بالحروف فقط. لو حقل مش واضح، سيبه على قيمته الحالية.');
      return;
    }
    if (!nextName && !nextNationality) return;

    lock.current = true;
    const signal = lifetime.current.signal;
    setSaving(true);
    setFailure('');
    try {
      const { data, error } = await callUntypedRpc<string>('apply_whatsapp_identity_review', {
        _organization: organizationId, _conversation: conversationId, _message: messageId,
        _customer: customer.id, _source_path: source.storage_path, _expected_updated_at: customer.updated_at,
        _name: nextName, _nationality: nextNationality,
      });
      if (error?.code === '40001') {
        if (!signal.aborted) setFailure('المستند أو بيانات العميل اتغيّروا. اقفل المراجعة وافتحها تاني.');
        return;
      }
      if (error || data !== customer.id) throw new Error('identity_save_failed');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customers', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations', organizationId] }),
        queryClient.invalidateQueries({ queryKey: ['whatsapp-conversation', organizationId, conversationId] }),
      ]);
      if (!signal.aborted) {
        toast.success('تم تحديث بيانات العميل');
        close();
      }
    } catch {
      if (!signal.aborted) setFailure('تعذّر حفظ تحديث بيانات العميل.');
    } finally {
      lock.current = false;
      if (!signal.aborted) setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={open => !open && !saving && close()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle>مراجعة مستند الهوية</DialogTitle>
          <DialogDescription>استخدم المستند لمراجعة الاسم والجنسية قبل تحديث ملف العميل.</DialogDescription>
        </DialogHeader>
        {source && (
          <div className="space-y-4">
            {isIdentityImage(mime) ? (
              <a href={preview} target="_blank" rel="noreferrer" className="block">
                <img src={preview} alt="مرفق الهوية للمراجعة" className="max-h-60 w-full rounded-md object-contain" />
              </a>
            ) : (
              <a href={preview} target="_blank" rel="noreferrer" className="block underline">افتح ملف PDF للمراجعة اليدوية</a>
            )}
            {isIdentityImage(mime) && (
              <Button type="button" variant="outline" disabled={ocrRunning || saving} onClick={readPhoto}>
                {ocrRunning ? <Loader2 className="size-4 animate-spin" /> : <FileSearch className="size-4" />}
                {ocrRunning ? 'جاري قراءة الصورة على جهازك…' : 'اقرأ الاسم والجنسية من الصورة'}
              </Button>
            )}
            {notice && <p role="status" className="text-sm text-muted-foreground">{notice}</p>}
            {customer && <p className="text-sm text-muted-foreground">العميل المرتبط بالمحادثة <bdi className="font-medium">{customer.name}</bdi></p>}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor={`${key}-name`}>الاسم</Label>
                <Input id={`${key}-name`} value={name} maxLength={120} disabled={ocrRunning || saving}
                  autoComplete="off" onChange={event => { setName(event.target.value); setConfirmed(false); }} />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${key}-nationality`}>الجنسية</Label>
                <Input id={`${key}-nationality`} value={nationality} maxLength={70} disabled={ocrRunning || saving}
                  autoComplete="off" onChange={event => { setNationality(event.target.value); setConfirmed(false); }} />
              </div>
            </div>
            {customer ? (
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirmed} disabled={ocrRunning || saving}
                  onChange={event => setConfirmed(event.target.checked)} className="mt-0.5" />
                راجعت البيانات واتأكدت إن المستند يخص العميل المرتبط بالمحادثة.
              </label>
            ) : (
              <p className="text-sm text-muted-foreground">اربط المحادثة بالعميل عشان تقدر تحفظ البيانات في ملفه.</p>
            )}
          </div>
        )}
        {!source && !failure && <p role="status" className="text-sm text-muted-foreground">جاري التحقق من المرفق…</p>}
        {failure && <p role="alert" className="text-sm text-destructive">{failure}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={saving} onClick={close}>إغلاق</Button>
          {customer && (
            <Button type="button" disabled={!confirmed || (!nameChanged && !nationalityChanged) || saving || ocrRunning} onClick={saveFields}>
              {saving ? 'جاري الحفظ…' : 'حدّث ملف العميل'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function WhatsAppIdentityReview(props: Props) {
  const { user } = useOptimizedAuth();
  const { hasPermission } = useSupabasePermissions();
  const [reviewer, setReviewer] = useState<string | null>(null);
  const identityKey = user?.id && [user.id, props.organizationId, props.conversationId, props.messageId, props.path].join(':');
  if (!identityKey || !isIdentityAttachment(props.mime)
    || !hasPermission('whatsapp_view') || !hasPermission('customers_edit')) return null;

  return (
    <>
      <Button type="button" size="sm" variant="ghost" onClick={() => setReviewer(identityKey)}>
        <FileSearch className="size-4" /> مراجعة مستند هوية
      </Button>
      {reviewer === identityKey && <IdentityReviewDialog key={identityKey} {...props} close={() => setReviewer(null)} />}
    </>
  );
}
