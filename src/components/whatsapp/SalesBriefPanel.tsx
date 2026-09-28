import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ClipboardList, Loader2 } from 'lucide-react';
import { useSalesBrief } from '@/hooks/useSalesBrief';
import { usePriceCatalog } from '@/hooks/usePriceCatalog';
import { SalesQuoteDraftBuilder } from './SalesQuoteDraftBuilder';

interface Props { conversationId: string }

const Field: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="flex items-start justify-between gap-2 text-sm py-1 border-b last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium text-end">{value === null || value === undefined || value === '' ? '—' : value}</span>
  </div>
);

export const SalesBriefPanel: React.FC<Props> = ({ conversationId }) => {
  const { brief, isLoading } = useSalesBrief(conversationId);
  const { rows } = usePriceCatalog(brief?.destination || undefined);

  if (isLoading) return <div className="p-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>;

  if (!brief) {
    return (
      <div className="p-4 text-sm text-muted-foreground text-center">
        <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-50" />
        لم يجمع وكيل المبيعات الذكي بيانات لهذه المحادثة بعد.
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-sm flex items-center gap-1">
          <ClipboardList className="w-4 h-4" /> ملخص طلب العميل
        </h4>
        <Badge variant={brief.readiness === 'ready_for_quote' ? 'default' : 'secondary'}>
          {brief.readiness === 'ready_for_quote' ? 'جاهز للتسعير' : 'قيد التأهيل'}
        </Badge>
      </div>

      <Card><CardContent className="p-3">
        <Field label="الوجهة" value={brief.destination} />
        <Field label="من" value={brief.travel_from} />
        <Field label="إلى" value={brief.travel_to} />
        <Field label="عدد الكبار" value={brief.adults} />
        <Field label="عدد الأطفال" value={brief.children} />
        <Field label="أعمار الأطفال" value={brief.children_ages} />
        <Field label="الميزانية" value={brief.budget_range} />
        <Field label="نوع الرحلة" value={brief.trip_type} />
        <Field label="نظام الإقامة" value={brief.board_preference} />
      </CardContent></Card>

      {brief.notes && <p className="text-sm bg-muted p-2 rounded">{brief.notes}</p>}

      {!!rows.length && (
        <div className="space-y-2">
          <h5 className="text-xs font-semibold text-muted-foreground">أسعار بيع مناسبة للوجهة</h5>
          {rows.slice(0, 6).map((r) => (
            <Card key={r.id}><CardContent className="p-2 text-xs space-y-1">
              <div className="font-medium">{r.name}{r.rating ? ` — ${r.rating}` : ''}</div>
              <div className="text-muted-foreground">
                {[r.board, r.valid_from && r.valid_to ? `${r.valid_from} → ${r.valid_to}` : null].filter(Boolean).join(' | ')}
              </div>
              <div>
                {[r.price_single && `سنجل ${r.price_single}`, r.price_double && `دبل ${r.price_double}`,
                  r.price_triple && `تربل ${r.price_triple}`].filter(Boolean).join(' • ')} {r.currency}
              </div>
            </CardContent></Card>
          ))}
          <p className="text-xs text-muted-foreground">السعر مبدئي ويخضع لتأكيد التوافر قبل إصدار عرض رسمي.</p>
        </div>
      )}

      {!!rows.length && <SalesQuoteDraftBuilder conversationId={conversationId} brief={brief} rows={rows} />}
    </div>
  );
};
