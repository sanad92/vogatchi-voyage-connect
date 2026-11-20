import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import type { PassportFields } from '@/lib/passportMrz';

type Review = PassportFields & { message_id: string; preview: string; needsReading: boolean };

const emptyFields: PassportFields = { full_name: '', passport_number: '', nationality: '', birth_date: '', expiry_date: '' };
const fields: { key: keyof PassportFields; title: string; type?: 'date' }[] = [
  { key: 'full_name', title: 'الاسم كما يظهر في الجواز' },
  { key: 'passport_number', title: 'رقم الجواز' },
  { key: 'nationality', title: 'رمز الجنسية (٣ حروف)' },
  { key: 'birth_date', title: 'تاريخ الميلاد', type: 'date' },
  { key: 'expiry_date', title: 'تاريخ الانتهاء', type: 'date' },
];

interface Props {
  organizationId: string;
  conversationId: string;
}

export function WhatsAppPassportReview({ organizationId, conversationId }: Props) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [scanning, setScanning] = useState(false);
  const [notice, setNotice] = useState('');
  const previews = useRef<string[]>([]);
  const mounted = useRef(true);
  const queryClient = useQueryClient();
  const key = ['wa-passport-reviews', organizationId, conversationId];

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      previews.current.forEach(url => URL.revokeObjectURL(url));
      previews.current = [];
    };
  }, []);

  const approved = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from('whatsapp_passport_reviews')
        .select('message_id, full_name, passport_number, nationality, birth_date, expiry_date')
        .eq('organization_id', organizationId).eq('conversation_id', conversationId).order('approved_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const attachments = useQuery({
    queryKey: ['wa-passport-attachments', organizationId, conversationId],
    enabled: open,
    queryFn: async () => {
      const { data, error } = await supabase.from('whatsapp_messages')
        .select('id, sent_at, media_file_name, media_storage_path')
        .eq('organization_id', organizationId).eq('conversation_id', conversationId).eq('direction', 'inbound')
        .in('media_mime_type', ['image/jpeg', 'image/png', 'image/webp'])
        .not('media_storage_path', 'is', null).order('sent_at', { ascending: false }).limit(40);
      if (error) throw error;
      return data;
    },
  });

  const clearPreviews = () => {
    previews.current.forEach(url => URL.revokeObjectURL(url));
    previews.current = [];
  };

  const close = () => {
    clearPreviews();
    setOpen(false);
    setReviews([]);
    setSelected([]);
    setNotice('');
  };

  const approval = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('wa_approve_passport_reviews', {
        _org: organizationId,
        _conversation: conversationId,
        _items: reviews.map(({ message_id, full_name, passport_number, nationality, birth_date, expiry_date }) => ({
          message_id, full_name, passport_number, nationality, birth_date, expiry_date,
        })),
      });
      if (error || data !== reviews.length) throw new Error('Approval failed');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key });
      close();
    },
    onError: () => setNotice('تعذر اعتماد المجموعة. راجع الحقول والصلاحيات وحاول مرة أخرى.'),
  });

  const scan = async () => {
    setScanning(true);
    setNotice('');
    clearPreviews();
    const next: Review[] = [];
    let failures = 0;
    try {
      const { createPassportReader } = await import('@/lib/passportOcr');
      const reader = await createPassportReader();
      try {
        for (const attachment of attachments.data ?? []) {
          if (!mounted.current) return;
          if (!selected.includes(attachment.id) || !attachment.media_storage_path) continue;
          const { data, error } = await supabase.storage.from('whatsapp-media').download(attachment.media_storage_path);
          if (error || !data || data.size > 15 * 1024 * 1024) {
            failures++;
            continue;
          }
          const fields = await reader.read(data).catch(() => null);
          if (!mounted.current) return;
          const preview = URL.createObjectURL(data);
          previews.current.push(preview);
          next.push({ ...emptyFields, ...fields, message_id: attachment.id, preview, needsReading: !fields });
        }
      } finally {
        await reader.terminate();
      }
      if (mounted.current) {
        setReviews(next);
        if (failures) setNotice(`تعذر فتح ${failures} من الصور المحددة. أعد المحاولة قبل اعتماد المجموعة.`);
      }
    } catch {
      if (mounted.current) setNotice('تعذر تشغيل قارئ الجوازات. أعد المحاولة.');
    } finally {
      if (mounted.current) setScanning(false);
    }
  };

  const missingFields = reviews.some(review => fields.some(field => !review[field.key].trim()));

  return (
    <div className="space-y-2 rounded-md border p-3">
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ScanLine className="me-2 h-4 w-4" /> مراجعة جوازات السفر
      </Button>
      {approved.isError && <p className="text-xs text-destructive">تعذر تحميل المسافرين المعتمدين.</p>}
      {!!approved.data?.length && (
        <div className="space-y-1 text-xs">
          <p className="font-medium">المسافرون المعتمدون ({approved.data.length})</p>
          {approved.data.map(row => (
            <details key={row.message_id} className="rounded border p-2">
              <summary className="cursor-pointer" dir="auto">{row.full_name}</summary>
              <dl className="mt-2 grid grid-cols-2 gap-1">
                {fields.filter(field => field.key !== 'full_name').map(field => (
                  <div key={field.key}>
                    <dt className="text-muted-foreground">{field.title}</dt>
                    <dd dir="ltr" className="text-start">{row[field.key]}</dd>
                  </div>
                ))}
              </dl>
            </details>
          ))}
        </div>
      )}
      <Dialog open={open} onOpenChange={value => { if (!value && !scanning && !approval.isPending) close(); }}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle>قراءة جوازات من المحادثة</DialogTitle>
            <DialogDescription>اختار صور الجوازات، وراجع بيانات كل مسافر قبل اعتماد المجموعة.</DialogDescription>
          </DialogHeader>
          {notice && <p role="alert" className="text-sm text-destructive">{notice}</p>}
          {!reviews.length && (
            <div className="space-y-2">
              {attachments.isLoading && <p role="status">جاري تحميل الصور…</p>}
              {attachments.isError && <Button variant="outline" onClick={() => attachments.refetch()}>إعادة تحميل الصور</Button>}
              {attachments.data?.length === 0 && <p>لا توجد صور واردة متاحة للقراءة.</p>}
              {attachments.data?.map(attachment => (
                <label key={attachment.id} className="flex items-center gap-2 rounded-md border p-2">
                  <Checkbox checked={selected.includes(attachment.id)} disabled={scanning || (selected.length >= 15 && !selected.includes(attachment.id))}
                    onCheckedChange={checked => setSelected(previous => checked ? [...previous, attachment.id] : previous.filter(id => id !== attachment.id))} />
                  <span className="text-sm">{attachment.media_file_name || 'صورة واردة'} · {attachment.sent_at ? new Date(attachment.sent_at).toLocaleString('ar-EG') : ''}</span>
                </label>
              ))}
            </div>
          )}
          {reviews.map((review, index) => (
            <section className="grid gap-3 rounded-md border p-3 sm:grid-cols-2" key={review.message_id}>
              <img src={review.preview} className="w-full rounded object-contain" alt={`مرفق المسافر ${index + 1}`} />
              <div className="space-y-2">
                <p className="text-sm font-medium">المسافر {index + 1}</p>
                {review.needsReading && <p className="text-xs text-destructive">القراءة غير مؤكدة. راجع الصورة وأدخل البيانات.</p>}
                {review.expiry_date && review.expiry_date < new Date().toISOString().slice(0, 10) && (
                  <p className="text-xs text-destructive">تاريخ صلاحية الجواز منتهٍ.</p>
                )}
                {fields.map(field => (
                  <label key={field.key} className="block space-y-1 text-xs">
                    <span>{field.title}</span>
                    <Input dir="ltr" type={field.type ?? 'text'} value={review[field.key]} disabled={approval.isPending}
                      onChange={event => setReviews(previous => previous.map(row => row.message_id === review.message_id
                        ? { ...row, [field.key]: event.target.value } : row))} />
                  </label>
                ))}
              </div>
            </section>
          ))}
          <DialogFooter>
            {reviews.length ? (
              <>
                <Button variant="outline" disabled={approval.isPending} onClick={() => { clearPreviews(); setNotice(''); setReviews([]); }}>رجوع لاختيار الصور</Button>
                <Button disabled={approval.isPending || missingFields || reviews.length !== selected.length} onClick={() => approval.mutate()}>
                  {approval.isPending ? 'جاري الاعتماد…' : 'اعتماد المسافرين'}
                </Button>
              </>
            ) : (
              <Button disabled={!selected.length || scanning} onClick={scan}>{scanning ? 'جاري قراءة الصور…' : 'استخراج البيانات'}</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
