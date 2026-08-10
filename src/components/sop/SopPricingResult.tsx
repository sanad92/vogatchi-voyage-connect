import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Star, Tag } from 'lucide-react';
import {
  usePricingOptions,
  usePricingRequests,
  useSavePricingOption,
  type SopPricingOption,
} from '@/hooks/useSop';

const STATUS_LABELS: Record<string, string> = {
  requested: 'بانتظار التسعير',
  in_progress: 'جاري التسعير',
  quoted: 'تم إرسال التسعير',
  requoted: 'تم إعادة التسعير',
  recheck: 'بانتظار إعادة التأكد',
  closed: 'مغلق',
  cancelled: 'ملغي',
};

const money = (v: number, c: string) => `${Number(v || 0).toLocaleString()} ${c || ''}`.trim();

const OptionCard = ({ o, onSelect }: { o: SopPricingOption; onSelect: () => void }) => (
  <div className={`rounded-md border p-2 space-y-1 text-xs ${o.is_selected ? 'border-primary bg-primary/5' : ''}`}>
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium">{o.product_name || `الخيار ${o.option_index}`}</span>
      <div className="flex items-center gap-1">
        {o.is_recommended && (
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Star className="h-3 w-3" /> موصى به
          </Badge>
        )}
        {o.is_selected && (
          <Badge className="text-[10px] gap-1">
            <CheckCircle2 className="h-3 w-3" /> المختار
          </Badge>
        )}
      </div>
    </div>
    <div className="text-muted-foreground">المورد: {o.supplier_name || '—'}</div>
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      <span>سعر البيع: <strong>{money(o.selling_price, o.currency)}</strong></span>
      {o.payment_deadline && (
        <span>آخر موعد للسداد: {new Date(o.payment_deadline).toLocaleDateString('ar-EG')}</span>
      )}
      {o.cancellation_deadline && (
        <span>آخر موعد للإلغاء: {new Date(o.cancellation_deadline).toLocaleDateString('ar-EG')}</span>
      )}
    </div>
    {o.cancellation_policy && <div className="text-muted-foreground">سياسة الإلغاء: {o.cancellation_policy}</div>}
    {o.notes && <div className="text-muted-foreground">{o.notes}</div>}
    {!o.is_selected && (
      <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={onSelect}>
        اعتماد هذا الخيار للعميل
      </Button>
    )}
  </div>
);

/** Shows Sales the pricing that Reservations published for this lead. */
export const SopPricingResult = ({ leadId }: { leadId: string }) => {
  const { data: requests } = usePricingRequests({ leadId });
  const latest = (requests || [])[0];
  const { data: options } = usePricingOptions(latest?.id);
  const save = useSavePricingOption();

  if (!latest) return null;

  return (
    <Card dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Tag className="h-4 w-4" /> نتيجة التسعير من الحجوزات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{STATUS_LABELS[latest.status] || latest.status}</Badge>
          {latest.price_valid_until && (
            <span className="text-muted-foreground">
              صلاحية السعر حتى {new Date(latest.price_valid_until).toLocaleDateString('ar-EG')}
            </span>
          )}
          {latest.quoted_at && (
            <span className="text-muted-foreground">
              أُرسل: {new Date(latest.quoted_at).toLocaleString('ar-EG')}
            </span>
          )}
        </div>

        {latest.recommendation && (
          <div className="rounded-md border bg-muted/40 p-2">
            <span className="text-muted-foreground">توصية الحجوزات: </span>
            {latest.recommendation}
          </div>
        )}
        {latest.notes && <div className="text-muted-foreground">ملاحظات الطلب: {latest.notes}</div>}
        {latest.recheck_notes && (
          <div className="rounded-md border p-2">
            إعادة التأكد: {latest.recheck_changed ? 'تغيّر السعر/التوفر' : 'بدون تغيير'} — {latest.recheck_notes}
          </div>
        )}

        {(options || []).length > 0 ? (
          <div className="space-y-2">
            {(options || []).map((o) => (
              <OptionCard
                key={o.id}
                o={o}
                onSelect={() =>
                  save.mutate({ id: o.id, pricing_request_id: latest.id, is_selected: true } as any)
                }
              />
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">لم تُضف خيارات تسعير بعد.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default SopPricingResult;
