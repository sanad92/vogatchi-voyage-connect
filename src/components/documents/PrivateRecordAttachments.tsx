import { useId, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Download, Paperclip } from 'lucide-react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const extensions: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};
const acceptedTypes = Object.keys(extensions).join(',');
const maxSize = 10 * 1024 * 1024;

interface Props {
  bucket: 'pilgrimage-attachments' | 'support-attachments';
  organizationId: string;
  recordId: string;
  canUpload: boolean;
}

function attachmentName(name: string) {
  const separator = name.indexOf('_');
  return separator < 0 ? name : name.slice(separator + 1);
}

export default function PrivateRecordAttachments({ bucket, organizationId, recordId, canUpload }: Props) {
  const inputId = useId();
  const qc = useQueryClient();
  const { user } = useOptimizedAuth();
  const [file, setFile] = useState<File | null>(null);
  const [inputVersion, setInputVersion] = useState(0);
  const [downloadName, setDownloadName] = useState<string | null>(null);
  const folder = `${organizationId}/${recordId}`;
  const storage = supabase.storage.from(bucket);
  const queryKey = ['private-record-attachments', user?.id, bucket, folder] as const;
  const attachments = useQuery({
    queryKey,
    enabled: !!user,
    queryFn: async () => {
      const result = [];
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await storage.list(folder, {
          limit: 100, offset, sortBy: { column: 'created_at', order: 'desc' },
        });
        if (error) throw error;
        result.push(...data.filter(item => item.id));
        if (data.length < 100) return result;
      }
    },
  });

  const upload = useMutation({
    mutationFn: async (selected: File) => {
      const extension = extensions[selected.type];
      if (!canUpload || !extension || !selected.size || selected.size > maxSize) {
        throw new Error('اختَر ملف PDF أو صورة JPG أو PNG بحجم يصل إلى ١٠ ميجابايت.');
      }
      const basename = selected.name.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(-100);
      const name = `${/[a-zA-Z0-9]/.test(basename) ? basename : 'attachment'}${extension}`;
      const { error } = await storage.upload(`${folder}/${crypto.randomUUID()}_${name}`, selected, {
        contentType: selected.type,
        upsert: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setFile(null);
      setInputVersion(version => version + 1);
      void qc.invalidateQueries({ queryKey });
      toast.success('تم رفع المرفق');
    },
    onError: error => toast.error(error.message || 'تعذّر رفع المرفق.'),
  });

  async function download(name: string) {
    setDownloadName(name);
    try {
      const { data, error } = await storage.download(`${folder}/${name}`);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachmentName(name);
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('تعذّر تحميل المرفق.');
    } finally {
      setDownloadName(null);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <h3 className="flex items-center gap-2 font-medium"><Paperclip className="h-4 w-4" />المرفقات</h3>
      {attachments.isLoading && <p className="text-sm text-muted-foreground" role="status">جاري تحميل المرفقات...</p>}
      {attachments.isError && (
        <div className="flex flex-wrap items-center gap-2" role="alert">
          <p className="text-sm">تعذّر تحميل المرفقات.</p>
          <Button type="button" size="sm" variant="outline" onClick={() => void attachments.refetch()}>إعادة المحاولة</Button>
        </div>
      )}
      {attachments.isSuccess && !attachments.data.length && <p className="text-sm text-muted-foreground">لا توجد مرفقات.</p>}
      {attachments.data?.map(item => (
        <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
          <span className="min-w-0 break-all" dir="auto" data-no-translate>{attachmentName(item.name)}</span>
          <Button type="button" size="sm" variant="ghost" disabled={downloadName !== null} onClick={() => void download(item.name)}>
            <Download className="h-4 w-4" />تحميل
          </Button>
        </div>
      ))}
      {canUpload && (
        <div className="space-y-2">
          <Label htmlFor={inputId}>اختيار مرفق PDF أو JPG أو PNG</Label>
          <div className="flex flex-wrap items-center gap-2">
            <Input key={inputVersion} id={inputId} type="file" accept={acceptedTypes} className="w-auto max-w-full"
              disabled={upload.isPending} onChange={event => setFile(event.currentTarget.files?.[0] ?? null)} />
            <Button type="button" size="sm" disabled={!file || upload.isPending} onClick={() => file && upload.mutate(file)}>
              {upload.isPending ? 'جاري الرفع...' : 'رفع المرفق'}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
