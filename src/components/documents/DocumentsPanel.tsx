import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Download, Eye, Trash2, Search, FileText, Clock, ShieldAlert,
} from 'lucide-react';
import {
  DOCUMENT_CATEGORIES, documentCategoryLabel,
  useDocumentCenter, useDocumentAudit,
  type DocumentCategory, type DocumentRow,
} from '@/hooks/useDocumentCenter';
import { DocumentUploader } from './DocumentUploader';
import { format } from 'date-fns';

interface Scope {
  customerId?: string;
  bookingId?: string;
  supplierId?: string;
}

interface Props extends Scope {
  title?: string;
  defaultCategory?: DocumentCategory;
}

const daysUntil = (d?: string | null) => {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
};

export const DocumentsPanel = ({
  customerId, bookingId, supplierId,
  title = 'المستندات',
  defaultCategory = 'other',
}: Props) => {
  const [category, setCategory] = useState<DocumentCategory | 'all'>('all');
  const [search, setSearch] = useState('');
  const [previewDoc, setPreviewDoc] = useState<DocumentRow | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const {
    documents, isLoading, remove, getSignedUrl, download, stats,
  } = useDocumentCenter({
    category, search, customerId, bookingId, supplierId,
  });

  const auditQ = useDocumentAudit(previewDoc?.id);

  const grouped = useMemo(() => {
    return documents.reduce<Record<string, DocumentRow[]>>((acc, d) => {
      (acc[d.category] = acc[d.category] || []).push(d);
      return acc;
    }, {});
  }, [documents]);

  const openPreview = async (doc: DocumentRow) => {
    setPreviewDoc(doc);
    try {
      const url = await getSignedUrl(doc.file_path, doc.id);
      setPreviewUrl(url);
    } catch { setPreviewUrl(null); }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {title}
            <Badge variant="outline">{stats.total}</Badge>
            {stats.expiringSoon > 0 && (
              <Badge variant="secondary" className="gap-1">
                <Clock className="h-3 w-3" /> {stats.expiringSoon} تنتهي قريبًا
              </Badge>
            )}
            {stats.expired > 0 && (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="h-3 w-3" /> {stats.expired} منتهية
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <DocumentUploader
            defaultCategory={defaultCategory}
            customerId={customerId}
            bookingId={bookingId}
            supplierId={supplierId}
            compact
          />

          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pr-8"
                placeholder="بحث في المستندات..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={(v) => setCategory(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفئات</SelectItem>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{documentCategoryLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">جاري التحميل...</p>
          ) : documents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">لا توجد مستندات بعد.</p>
          ) : (
            <div className="space-y-4">
              {Object.entries(grouped).map(([cat, items]) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {documentCategoryLabel(cat as DocumentCategory)} · {items.length}
                  </p>
                  <div className="grid gap-2 md:grid-cols-2">
                    {items.map((doc) => {
                      const d = daysUntil(doc.expiry_date);
                      return (
                        <div key={doc.id}
                          className="border rounded-md p-3 flex items-start justify-between gap-2 hover:bg-muted/40 transition-colors">
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{doc.title}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {doc.file_name} · {format(new Date(doc.created_at), 'yyyy-MM-dd')}
                            </p>
                            {doc.tags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {doc.tags.slice(0, 4).map((t) => (
                                  <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>
                                ))}
                              </div>
                            )}
                            {doc.expiry_date && (
                              <Badge
                                variant={d !== null && d < 0 ? 'destructive' : d !== null && d < 30 ? 'secondary' : 'outline'}
                                className="mt-1 text-[10px] gap-1">
                                <Clock className="h-3 w-3" />
                                {d !== null && d < 0
                                  ? `منتهية منذ ${-d} يوم`
                                  : `تنتهي خلال ${d} يوم`}
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Button size="icon" variant="ghost" onClick={() => openPreview(doc)} title="معاينة">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => download(doc)} title="تحميل">
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost"
                              onClick={() => confirm('حذف هذا المستند؟') && remove.mutate(doc.id)}
                              title="حذف">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!previewDoc} onOpenChange={(o) => { if (!o) { setPreviewDoc(null); setPreviewUrl(null); } }}>
        <DialogContent className="max-w-4xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{previewDoc?.title}</DialogTitle>
          </DialogHeader>
          {previewUrl && previewDoc?.mime_type?.startsWith('image/') ? (
            <img src={previewUrl} alt={previewDoc.title} className="max-h-[70vh] mx-auto" />
          ) : previewUrl ? (
            <iframe src={previewUrl} className="w-full h-[70vh] rounded border" />
          ) : (
            <p className="text-sm text-muted-foreground">جاري تجهيز المعاينة...</p>
          )}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-1">سجل التدقيق</p>
            <div className="max-h-40 overflow-auto text-xs space-y-1">
              {(auditQ.data ?? []).map((row: any) => (
                <div key={row.id} className="flex justify-between border-b py-1">
                  <span>{row.action}</span>
                  <span className="text-muted-foreground">{format(new Date(row.created_at), 'yyyy-MM-dd HH:mm')}</span>
                </div>
              ))}
              {(auditQ.data ?? []).length === 0 && (
                <p className="text-muted-foreground">لا توجد سجلات.</p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
