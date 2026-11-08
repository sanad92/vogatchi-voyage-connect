import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, ChevronDown, ChevronUp, RefreshCw, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface QuoteSnapshotHeader {
  quote_number?: string;
  status?: string;
  currency?: string | null;
  destination?: string | null;
  total_amount?: number | null;
  total_cost?: number | null;
  total_profit?: number | null;
  travel_date?: string | null;
  return_date?: string | null;
}
interface QuoteSnapshotItem {
  item_id: string;
  item_type: string;
  description: string;
  quantity: number;
  total_selling: number;
  total_cost: number;
}
interface QuoteVersionSnapshot {
  id: string;
  quote_id: string;
  organization_id: string;
  version_number: number;
  quote_snapshot: QuoteSnapshotHeader;
  items_snapshot: QuoteSnapshotItem[];
  item_count: number;
  created_at: string;
}

const client = supabase as any;
const value = (amount: number | null | undefined, currency: string) =>
  amount == null ? '—' : `${Number(amount).toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`;
const datetime = (str: string) => {
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
};

/** Snapshots are saved ONLY when someone explicitly clicks archive. */
export default function QuoteVersionHistory({
  quoteId,
  canCapture,
}: {
  quoteId: string;
  canCapture: boolean;
}) {
  const orgId = useOrgId();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);

  const versions = useQuery({
    queryKey: ['quote-version-snapshots', orgId, quoteId],
    enabled: !!orgId && !!quoteId,
    queryFn: async (): Promise<QuoteVersionSnapshot[]> => {
      if (!orgId) return [];
      const { data, error } = await client.from('quote_version_snapshots')
        .select('id,quote_id,organization_id,version_number,quote_snapshot,items_snapshot,item_count,created_at')
        .eq('organization_id', orgId)
        .eq('quote_id', quoteId)
        .order('version_number', { ascending: false })
        .limit(50);
      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          throw new Error('ميزة أرشفة نسخ الأسعار غير مثبتة على قاعدة البيانات الحالية');
        }
        throw error;
      }
      return (data || []) as QuoteVersionSnapshot[];
    },
  });

  const capture = useMutation({
    mutationFn: async () => {
      const { data, error } = await client.rpc('capture_quote_version_snapshot', { p_quote_id: quoteId });
      if (error) throw error;
      if (!data?.id || !data?.version_number) throw new Error('لم يتم تأكيد حفظ نسخة عرض السعر');
      return data as { id: string; version_number: number; unchanged: boolean };
    },
    onSuccess: async result => {
      toast.success(result.unchanged
        ? `نسخة ${result.version_number} محفوظة بالفعل، ولم تتغير البيانات`
        : `تم أرشفة النسخة رقم ${result.version_number}`);
      await qc.invalidateQueries({ queryKey: ['quote-version-snapshots', orgId, quoteId] });
    },
    onError: (err: Error) => toast.error(err.message || 'تعذر حفظ النسخة'),
  });

  return (
    <Card className="print:hidden" dir="rtl">
      <CardHeader className="flex flex-row justify-between items-start gap-2 space-y-0">
        <div className="space-y-1">
          <CardTitle className="text-base flex gap-2 items-center">
            <Archive className="h-4 w-4" /> نسخ عروض الأسعار المؤرشفة
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            احفظ نسخة ثابتة من البنود والأسعار الحالية قبل تعديل العرض أو مشاركته.
            الأرشفة يدوية، ولا تغيّر العرض الحالي ولا ترسل أي مستند للعميل.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCapture && (
            <Button size="sm" disabled={capture.isPending} onClick={() => capture.mutate()}>
              <ShieldCheck className="w-4 h-4 ml-1" /> {capture.isPending ? 'جاري الحفظ…' : 'حفظ نسخة الآن'}
            </Button>
          )}
          <Button variant="outline" size="sm" disabled={versions.isFetching} onClick={() => versions.refetch()}>
            <RefreshCw className="h-4 w-4 ml-1" /> تحديث
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {versions.isLoading ? (
          <p className="text-sm text-muted-foreground">جاري تحميل النسخ المؤرشفة…</p>
        ) : versions.isError ? (
          <p className="text-sm text-destructive" role="alert">
            تعذر قراءة نسخ العرض: {(versions.error as Error)?.message || 'الخدمة غير متاحة'}
          </p>
        ) : versions.data?.length ? versions.data.map(v => {
          const currency = v.quote_snapshot.currency || '—';
          const open = expanded === v.id;
          return (
            <div key={v.id} className="border rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">V{v.version_number}</Badge>
                <p className="text-sm font-medium flex-1">
                  {value(v.quote_snapshot.total_amount, currency)} · {v.item_count} بند
                </p>
                <span className="text-xs text-muted-foreground">{datetime(v.created_at)}</span>
                <Button size="sm" variant="outline" onClick={() => setExpanded(open ? null : v.id)}>
                  {open ? <ChevronUp className="h-3.5 w-3.5 ml-1" /> : <ChevronDown className="h-3.5 w-3.5 ml-1" />}
                  {open ? 'إخفاء البنود' : 'مراجعة النسخة'}
                </Button>
              </div>
              {open && (
                <div className="space-y-3 text-sm rounded-md bg-muted/30 p-3">
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                    <div><p className="text-xs text-muted-foreground">الحالة وقت الحفظ</p><p>{v.quote_snapshot.status || '—'}</p></div>
                    <div><p className="text-xs text-muted-foreground">إجمالي البيع</p><p>{value(v.quote_snapshot.total_amount,currency)}</p></div>
                    <div><p className="text-xs text-muted-foreground">إجمالي التكلفة</p><p>{value(v.quote_snapshot.total_cost,currency)}</p></div>
                    <div><p className="text-xs text-muted-foreground">الربح المسجل</p><p>{value(v.quote_snapshot.total_profit,currency)}</p></div>
                  </div>
                  <div className="space-y-2">
                    {v.items_snapshot.map((i, idx) => (
                      <div key={i.item_id || idx} className="flex flex-wrap justify-between gap-2 border-b last:border-b-0 pb-2">
                        <p className="flex-1">{i.description} <span className="text-xs text-muted-foreground">({i.item_type} × {i.quantity})</span></p>
                        <p className="text-xs">{value(i.total_selling,currency)} بيع · {value(i.total_cost,currency)} تكلفة</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        }) : (
          <p className="text-sm text-muted-foreground">
            مفيش نسخ محفوظة بعد. أول نسخة هتتعمل لما تضغط «حفظ نسخة الآن».
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          عرض النسخ يتطلب صلاحية المالية. التاريخ هنا يوضح وقت الأرشفة اليدوية، مش كل تعديل حصل تلقائيًا.
        </p>
      </CardContent>
    </Card>
  );
}
