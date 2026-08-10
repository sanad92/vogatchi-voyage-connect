import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, CheckCircle2, Star, Tag } from 'lucide-react';
import {
  useCreatePricingRequest,
  usePricingOptions,
  usePricingRequests,
  useSavePricingOption,
  type SopPricingOption,
  type SopPricingRequest,
} from '@/hooks/useSop';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { useCanViewPricingCosts } from '@/hooks/usePricingVisibility';
import {
  cancellationChargeLabel,
  cancellationTypeLabel,
  computePricingMetrics,
  dateLabel,
  dateTimeLabel,
  mealPlanLabel,
  money,
  otaSourceLabel,
  pct,
  recommendationReasonLabel,
  transferStatusLabel,
} from '@/lib/sopPricing';

const STATUS_LABELS: Record<string, string> = {
  requested: 'بانتظار التسعير',
  in_progress: 'جاري التسعير',
  quoted: 'تم إرسال التسعير',
  requoted: 'تم إعادة التسعير',
  recheck: 'بانتظار إعادة التأكد',
  closed: 'مغلق',
  cancelled: 'ملغي',
};

const Line = ({ label, value }: { label: string; value?: React.ReactNode }) => {
  if (value === null || value === undefined || value === '' || value === '—') return null;
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-end break-words">{value}</span>
    </div>
  );
};

const OfferCard = ({
  o, canViewCosts, canSelect, onSelect,
}: { o: SopPricingOption; canViewCosts: boolean; canSelect: boolean; onSelect: () => void }) => {
  const m = computePricingMetrics(o);
  const cur = o.currency || 'EGP';
  const title = o.hotel_name || o.product_name || `الخيار ${o.option_index}`;
  const roomLine = [o.room_type, mealPlanLabel(o.meal_plan), o.room_view].filter(Boolean).join(' | ');
  const dates = o.check_in
    ? `${dateLabel(o.check_in)} → ${dateLabel(o.check_out)}${m.nights ? ` (${m.nights} ليالٍ)` : ''}`
    : undefined;

  const cancellation = [
    cancellationTypeLabel(o.cancellation_type),
    o.free_cancellation_until ? `مجاني حتى ${dateTimeLabel(o.free_cancellation_until)}` : null,
    o.cancellation_charge_model
      ? `غرامة: ${cancellationChargeLabel(o.cancellation_charge_model)}${
          o.cancellation_charge_value ? ` (${o.cancellation_charge_value})` : ''
        }`
      : null,
  ].filter(Boolean).join(' • ') || o.cancellation_policy || undefined;

  return (
    <div className={`rounded-md border p-2.5 space-y-2 text-xs ${o.is_recommended ? 'border-primary bg-primary/5' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-sm">{title}</span>
        <div className="flex items-center gap-1">
          {m.isExpired && (
            <Badge variant="destructive" className="text-[10px] gap-1">
              <AlertTriangle className="h-3 w-3" /> انتهت الصلاحية
            </Badge>
          )}
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

      <div className="grid gap-1">
        <Line label="الغرفة" value={roomLine || undefined} />
        <Line label="التواريخ" value={dates} />
        <Line label="عدد الغرف" value={o.rooms_count ?? undefined} />
        <Line label="الوجهة" value={o.destination || undefined} />
      </div>

      <div className="rounded-md border bg-background p-2 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">سعر Vogatchi</span>
          <span className="text-sm font-bold">{money(m.vogatchiTotal, cur)}</span>
        </div>
        <Line label="سعر Vogatchi / ليلة" value={money(m.vogatchiPerNight, cur)} />
        {m.otaTotal > 0 && (
          <>
            <Line label={`سعر ${otaSourceLabel(o.ota_source) || 'OTA'}`} value={money(m.otaTotal, cur)} />
            <Line label="سعر OTA / ليلة" value={money(m.otaPerNight, cur)} />
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>التوفير مقابل OTA</span>
              <span>{money(m.savingVsOta, cur)} ({pct(m.savingVsOtaPct)})</span>
            </div>
          </>
        )}
        {m.hotelDirectTotal > 0 && (
          <>
            <Line label="سعر الفندق المباشر" value={money(m.hotelDirectTotal, cur)} />
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
              <span>التوفير مقابل الفندق</span>
              <span>{money(m.savingVsDirect, cur)} ({pct(m.savingVsDirectPct)})</span>
            </div>
          </>
        )}
      </div>

      <div className="grid gap-1">
        <Line label="سياسة الإلغاء" value={cancellation} />
        <Line label="ملاحظات الإلغاء" value={o.cancellation_notes || undefined} />
        <Line
          label="السعر صالح حتى"
          value={o.price_valid_until
            ? `${dateTimeLabel(o.price_valid_until)}${m.isExpired ? ' — انتهت الصلاحية' : ''}`
            : undefined}
        />
        <Line
          label="الانتقالات"
          value={[
            transferStatusLabel(o.transfer_status),
            o.transfer_type,
            o.transfer_selling_price ? money(o.transfer_selling_price, cur) : null,
          ].filter(Boolean).join(' • ') || undefined}
        />
        <Line
          label="سبب التوصية"
          value={[recommendationReasonLabel(o.recommendation_reason), o.recommendation_note]
            .filter(Boolean).join(' — ') || undefined}
        />
        <Line label="ملاحظات المبيعات" value={o.notes || undefined} />
      </div>

      {canViewCosts && (
        <div className="rounded-md border border-dashed p-2 grid gap-1">
          <span className="text-[10px] text-muted-foreground">بيانات داخلية (الحجوزات والإدارة)</span>
          <Line label="صافي التكلفة" value={money(o.net_cost, cur)} />
          <Line label="الربح الإجمالي" value={money(m.grossProfit, cur)} />
          <Line label="هامش الربح" value={pct(m.marginPct)} />
          <Line label="الماركب" value={pct(m.markupPct)} />
          <Line label="ملاحظات داخلية" value={o.internal_notes || undefined} />
        </div>
      )}

      {!o.is_selected && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-[11px]"
          disabled={!canSelect || m.isExpired}
          onClick={onSelect}
        >
          {m.isExpired ? 'يحتاج إعادة تسعير قبل الاعتماد' : 'اعتماد هذا الخيار للعميل'}
        </Button>
      )}
    </div>
  );
};

const RequestBlock = ({ req, latest }: { req: SopPricingRequest; latest: boolean }) => {
  const { data: options } = usePricingOptions(req.id);
  const save = useSavePricingOption();
  const { members } = useOrgMembers();
  const canViewCosts = useCanViewPricingCosts();
  const ownerName = req.assigned_to
    ? members.find((m) => m.user_id === req.assigned_to)?.profile?.full_name || req.assigned_to.slice(0, 8)
    : 'غير مستلم';
  const canSelect = ['quoted', 'requoted'].includes(req.status);

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
            صلاحية التسعير حتى {new Date(req.price_valid_until).toLocaleDateString('ar-EG')}
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
            <OfferCard
              key={o.id}
              o={o}
              canViewCosts={canViewCosts}
              canSelect={canSelect}
              onSelect={() => save.mutate({ id: o.id, pricing_request_id: req.id, is_selected: true } as any)}
            />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">لم تُضف عروض تسعير بعد.</p>
      )}
    </div>
  );
};

/** Pricing from Reservations — always visible for a lead, at any stage, full history. */
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
            <p className="text-muted-foreground">لا يوجد تسعير بعد</p>
            <Button
              size="sm"
              variant="outline"
              disabled={createRequest.isPending}
              onClick={() => createRequest.mutate({ leadId })}
            >
              طلب تسعير
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
