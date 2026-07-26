import { useCallback, useRef, useState } from 'react';
import { UploadCloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DOCUMENT_CATEGORIES,
  documentCategoryLabel,
  useDocumentCenter,
  type DocumentCategory,
} from '@/hooks/useDocumentCenter';
import { cn } from '@/lib/utils';

interface Props {
  defaultCategory?: DocumentCategory;
  customerId?: string;
  bookingId?: string;
  supplierId?: string;
  onUploaded?: () => void;
  compact?: boolean;
}

export const DocumentUploader = ({
  defaultCategory = 'other',
  customerId, bookingId, supplierId, onUploaded, compact,
}: Props) => {
  const { upload } = useDocumentCenter();
  const [dragging, setDragging] = useState(false);
  const [category, setCategory] = useState<DocumentCategory>(defaultCategory);
  const [expiry, setExpiry] = useState('');
  const [tags, setTags] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const arr = Array.from(files);
    for (const file of arr) {
      await upload.mutateAsync({
        file,
        category,
        customerId, bookingId, supplierId,
        expiryDate: expiry || null,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
    }
    onUploaded?.();
  }, [category, customerId, bookingId, supplierId, expiry, tags, upload, onUploaded]);

  return (
    <div className="space-y-3" dir="rtl">
      <div className={cn('grid gap-3', compact ? 'grid-cols-1 md:grid-cols-3' : 'md:grid-cols-3')}>
        <div>
          <Label className="text-xs">الفئة</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as DocumentCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{documentCategoryLabel(c)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">تاريخ الانتهاء (اختياري)</Label>
          <Input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">وسوم (مفصولة بفواصل)</Label>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="عاجل, VIP" />
        </div>
      </div>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragging(false);
          if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/30 hover:border-primary/60',
        )}
      >
        {upload.isPending ? (
          <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" /> جاري الرفع...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-sm">
            <UploadCloud className="h-8 w-8 text-primary" />
            <p className="font-medium">اسحب الملفات هنا أو انقر للاختيار</p>
            <p className="text-xs text-muted-foreground">
              تُحفظ بأمان وتُربط تلقائيًا بالسياق الحالي.
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {!compact && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
            <UploadCloud className="h-4 w-4 ml-1" /> اختيار ملفات
          </Button>
        </div>
      )}
    </div>
  );
};
