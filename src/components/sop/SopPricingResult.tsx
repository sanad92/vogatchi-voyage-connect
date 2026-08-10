import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Star, Tag } from 'lucide-react';
import {
  useCreatePricingRequest,
  usePricingOptions,
  usePricingRequests,
  useSavePricingOption,
  type SopPricingOption,
  type SopPricingRequest,
} from '@/hooks/useSop';
import { useOrgMembers } from '@/hooks/useOrgMembers';

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

const RequestBlock = ({ req, latest }: { req: SopPricingRequest; latest: boolean }) => {
  const { data: options } = usePricingOptions(req.id);
  const save = useSavePricingOption();
  const { members } = useOrgMembers();
  const ownerName = req.assigned_to
    ? members.find((m) => m.user_id === req.assigned_to)?.profile?.full_name || req.assigned_to.slice(0, 8)
    : 'غير مستلم';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={latest ? 'default' : 'outline'}>{STATUS_LABELS[req.status] || req.status}</Badge>
        <span className="text-muted-foreground">
          طُلب: {new Date(req.requested_at).toLocaleDateString('ar-EG')}
        </span>
        <span className="text-muted-foreground">مسؤول التسعير: {ownerName}</span>
        {(req.status === 'requoted' || req.recheck_changed) && (
          <Badge variant="destructive" className="text-[10px]">تمت إعادة تسعير</Badge>
        )}
        {req.price_valid_until && (
          <span className="text-muted-foreground">
            صلاحية السعر حتى {new Date(req.price_valid_until).toLocaleDateString('ar-EG')}
          </span>
        )}
      </div>

      {req.recommendation && (
        <div className="rounded-md border bg-muted/40 p-2">
          <span className="text-muted-foreground">توصية الحجوزات: </span>
          {req.recommendation}
        </div>
      )}
      {req.notes && <div className="text-muted-foreground">ملاحظات الطلب: {req.notes}</div>}
      {req.recheck_notes && (
        <div className="rounded-md border p-2">
          إعادة التأكد: {req.recheck_changed ? 'تغيّر السعر/التوفر' : 'بدون تغيير'} — {req.recheck_notes}
        </div>
      )}

      {(options || []).length > 0 ? (
        <div className="space-y-2">
          {(options || []).map((o) => (
            <OptionCard
              key={o.id}
              o={o}
              onSelect={() => save.mutate({ id: o.id, pricing_request_id: req.id, is_selected: true } as any)}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">لم تُضف خيارات تسعير بعد.</p>
      )}
    </div>
  );
};

/** Pricing from Reservations — always visible for a lead, at any stage. */
export const SopPricingResult = ({ leadId }: { leadId: string }) => {
  const { data: requests } = usePricingRequests({ leadId });
  const createRequest = useCreatePricingRequest();
  const list = requests || [];

  return (
    <Card dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Tag className="h-4 w-4" /> تسعير الحجوزات
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        {list.length === 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground">لا يوجد تسعير بعد لهذا العميل.</p>
            <Button
              size="sm"
              variant="outline"
              disabled={createRequest.isPending}
              onClick={() => createRequest.mutate({ leadId })}
            >
              طلب تسعير من الحجوزات
            </Button>
          </div>
        ) : (
          list.map((r, i) => (
            <div key={r.id} className="space-y-2">
              {i > 0 && <Separator />}
              <RequestBlock req={r} latest={i === 0} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default SopPricingResult;
