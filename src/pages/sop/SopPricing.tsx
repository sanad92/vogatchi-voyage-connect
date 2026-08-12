import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus } from 'lucide-react';
import {
  useCompleteRecheck,
  useDeletePricingOption,
  usePricingOptions,
  usePricingRequests,
  useClaimPricingRequest,
  usePublishPricing,
  useReturnToSales,
  useSavePricingOption,
  useSaveRequestValidity,
  useSopLead,
  useSopRealtime,
} from '@/hooks/useSop';
import SopLeadPanel from '@/components/sop/SopLeadPanel';
import DepartmentGate from '@/components/sop/DepartmentGate';
import MySopStatusBar from '@/components/sop/MySopStatusBar';
import PricingOfferEditor from '@/components/sop/PricingOfferEditor';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useCanViewPricingCosts } from '@/hooks/usePricingVisibility';
import { dateLabel, nightsBetween, publishBlockers, suggestedValidUntil } from '@/lib/sopPricing';

const STATUS_LABELS: Record<string, string> = {
  requested: 'مطلوب',
  in_progress: 'قيد التسعير',
  quoted: 'تم التسعير',
  requoted: 'تمت إعادة التسعير',
  recheck: 'مطلوب إعادة تأكد',
  recheck_requested: 'مطلوب إعادة تأكد',
  recheck_done: 'تمت إعادة التأكد',
  closed: 'مغلق',
  cancelled: 'ملغي',
};

const ADD_LABELS = ['+ إضافة العرض الأول', '+ إضافة العرض الثاني', '+ إضافة العرض الثالث'];

const HeaderItem = ({ label, value }: { label: string; value?: React.ReactNode }) => (
  <div className="rounded-md border bg-muted/30 p-2">
    <div className="text-[10px] text-muted-foreground">{label}</div>
    <div className="text-xs font-medium">{value === undefined || value === null || value === '' ? '—' : value}</div>
  </div>
);

const SopPricing = () => {
  usePageTitle('طلبات التسعير — الحجوزات');
  useSopRealtime();
  const { data: requests } = usePricingRequests();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = (requests || []).find((r) => r.id === selectedId) || null;
  const { data: options } = usePricingOptions(selectedId);
  const { data: lead } = useSopLead(selected?.lead_id);
  const canViewCosts = useCanViewPricingCosts();

  const saveOption = useSavePricingOption();
  const deleteOption = useDeletePricingOption();
  const publish = usePublishPricing();
  const completeRecheck = useCompleteRecheck();
  const claimRequest = useClaimPricingRequest();
  const returnToSales = useReturnToSales();
  const saveValidity = useSaveRequestValidity();
  const { user } = useOptimizedAuth();

  const unclaimed = (requests || []).filter((r) => !r.assigned_to && r.status !== 'closed' && r.status !== 'cancelled');
  const claimedAll = (requests || []).filter((r) => !!r.assigned_to);
  const PUBLISHED = ['quoted', 'requoted', 'closed', 'cancelled'];
  const claimed = claimedAll.filter((r) => !PUBLISHED.includes(r.status));
  const published = claimedAll.filter((r) => PUBLISHED.includes(r.status));

  const [validUntil, setValidUntil] = useState('');
  const [recommendation, setRecommendation] = useState('');
  // Offers with unsaved edits — publishing them would quote stale prices.
  const [dirtyOffers, setDirtyOffers] = useState<Record<string, boolean>>({});
  const setOfferDirty = (id: string, dirty: boolean) =>
    setDirtyOffers((p) => (p[id] === dirty ? p : { ...p, [id]: dirty }));

  useEffect(() => {
    setRecommendation(selected?.recommendation || '');
    setDirtyOffers({});
  }, [selectedId, selected?.recommendation]);

  const brief = (selected?.brief as Record<string, any>) || {};
  const defaults = useMemo(
    () => ({
      destination: lead?.destination || brief.destination || null,
      check_in: lead?.check_in || brief.check_in || null,
      check_out: lead?.check_out || brief.check_out || null,
    }),
    [lead?.destination, lead?.check_in, lead?.check_out, brief.destination, brief.check_in, brief.check_out],
  );

  const list = options || [];
  const isPublishedRequest = !!selected && ['quoted', 'closed'].includes(selected.status);

  // Readiness is always derived from persisted DB values, never from local form state.
  const unsavedOfferIndexes = list
    .filter((o) => dirtyOffers[o.id])
    .map((o) => Number(o.option_index) || 0);

  // Reload persisted validity, falling back to the offers' own validity date.
  useEffect(() => {
    setValidUntil(selected?.price_valid_until?.slice(0, 10) || suggestedValidUntil(list as any) || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, selected?.price_valid_until, list.map((o) => o.price_valid_until || '').join('|')]);

  const blockers = useMemo(
    () => publishBlockers(list as any, validUntil, { unsavedOfferIndexes }),
    [list, validUntil, unsavedOfferIndexes.join(',')], // eslint-disable-line react-hooks/exhaustive-deps
  );


  const addOption = () => {
    if (!selectedId || list.length >= 3) return;
    const nextIndex = list.reduce((max, o) => Math.max(max, Number(o.option_index) || 0), 0) + 1;
    saveOption.mutate({
      pricing_request_id: selectedId,
      option_index: nextIndex,
      net_cost: 0,
      selling_price: 0,
      currency: 'EGP',
      markup_type: 'percent',
      markup_value: 0,
      destination: defaults.destination,
      check_in: defaults.check_in,
      check_out: defaults.check_out,
      transfer_status: 'not_included',
    } as any);
  };


  const nights = nightsBetween(defaults.check_in, defaults.check_out);

  return (
    <DepartmentGate department="reservations">
      <div className="p-6 space-y-4" dir="rtl">
        <header>
          <h1 className="text-2xl font-bold">مساحة عمل الحجوزات</h1>
          <p className="text-sm text-muted-foreground">
            حد أقصى 3 عروض لكل طلب، مع مقارنة أسعار للعميل وبيانات ربحية داخلية
          </p>
        </header>

        <MySopStatusBar department="reservations" />



        <div className="grid gap-4 lg:grid-cols-4">
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-primary/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">طلبات تسعير غير مستلمة ({unclaimed.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {unclaimed.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-right border rounded-md p-2 text-xs transition cursor-pointer ${
                      selectedId === r.id ? 'ring-1 ring-primary' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{(r.brief as any)?.contact_name || 'طلب تسعير'}</span>
                      <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[r.status] || r.status}</Badge>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {(r.brief as any)?.destination || '—'} · {new Date(r.requested_at).toLocaleDateString('ar-EG')}
                    </div>
                    <Button
                      size="sm"
                      className="h-7 text-[11px] mt-2 w-full"
                      disabled={claimRequest.isPending}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); claimRequest.mutate(r.id); }}
                    >
                      استلم الطلب
                    </Button>
                  </div>
                ))}
                {!unclaimed.length && (
                  <p className="text-xs text-muted-foreground">لا توجد طلبات بانتظار الاستلام.</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">قيد التسعير ({claimed.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {claimed.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-right border rounded-md p-2 text-xs transition cursor-pointer ${
                      selectedId === r.id ? 'ring-1 ring-primary' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{(r.brief as any)?.contact_name || 'طلب تسعير'}</span>
                      <Badge variant="outline" className="text-[10px]">{STATUS_LABELS[r.status] || r.status}</Badge>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {(r.brief as any)?.destination || '—'} · {new Date(r.requested_at).toLocaleDateString('ar-EG')}
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {r.assigned_to === user?.id ? 'مستلم بواسطتك' : 'مستلم بواسطة زميل'}
                    </div>
                  </div>
                ))}
                {!claimed.length && <p className="text-xs text-muted-foreground">لا توجد طلبات قيد التسعير.</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">تم اعتمادها وإرسالها للمبيعات ({published.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {published.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full text-right border rounded-md p-2 text-xs transition cursor-pointer ${
                      selectedId === r.id ? 'ring-1 ring-primary' : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{(r.brief as any)?.contact_name || 'طلب تسعير'}</span>
                      <Badge variant="secondary" className="text-[10px]">{STATUS_LABELS[r.status] || r.status}</Badge>
                    </div>
                    <div className="text-muted-foreground mt-1">
                      {(r.brief as any)?.destination || '—'} · {new Date(r.requested_at).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                ))}
                {!published.length && <p className="text-xs text-muted-foreground">لا توجد طلبات معتمدة بعد.</p>}
              </CardContent>
            </Card>

          </div>

          <div className="lg:col-span-2 space-y-4">
            {!selected && (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">اختر طلب تسعير للبدء.</CardContent></Card>
            )}

            {selected && (
              <>
                {/* A) Read-only request header sourced from the lead */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">بيانات الطلب (للقراءة فقط)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                      <HeaderItem label="الوجهة" value={defaults.destination || lead?.city} />
                      <HeaderItem label="تاريخ الوصول" value={defaults.check_in ? dateLabel(defaults.check_in) : lead?.approx_dates} />
                      <HeaderItem label="تاريخ المغادرة" value={defaults.check_out ? dateLabel(defaults.check_out) : undefined} />
                      <HeaderItem label="عدد الليالي" value={nights || undefined} />
                      <HeaderItem label="البالغون" value={lead?.adults ?? brief.adults} />
                      <HeaderItem
                        label="الأطفال"
                        value={
                          (lead?.children_count ?? brief.children_count)
                            ? `${lead?.children_count ?? brief.children_count} — أعمار: ${
                                (lead?.children_ages || []).length ? (lead?.children_ages || []).join(', ') : 'غير محددة'
                              }`
                            : undefined
                        }
                      />
                      <HeaderItem label="الغرف / التوزيع" value={[lead?.rooms, lead?.occupancy].filter(Boolean).join(' · ')} />
                      <HeaderItem label="الجنسية" value={lead?.nationality ?? brief.nationality} />
                      <HeaderItem
                        label="الميزانية"
                        value={[lead?.budget_level, lead?.budget_amount ? Number(lead.budget_amount).toLocaleString() : null]
                          .filter(Boolean).join(' · ')}
                      />
                      <HeaderItem label="نوع الخدمة" value={lead?.service_type} />
                      <HeaderItem label="الأولويات" value={lead?.priorities} />
                      <HeaderItem label="طلبات خاصة" value={lead?.special_requests} />
                    </div>
                    {selected.notes && (
                      <p className="text-xs text-muted-foreground">ملاحظات المبيعات: {selected.notes}</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm">العروض ({list.length}/3)</CardTitle>
                    {list.length < 3 ? (
                      <Button size="sm" variant="outline" onClick={addOption} disabled={saveOption.isPending}>
                        <Plus className="h-3.5 w-3.5 ml-1" /> {ADD_LABELS[list.length]}
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        الحد الأقصى 3 عروض — احذف عرضاً لإضافة آخر
                      </span>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {list.map((o) => (
                      <PricingOfferEditor
                        key={o.id}
                        option={o}
                        defaults={defaults}
                        canViewCosts={canViewCosts}
                        onSave={(v) =>
                          saveOption.mutateAsync({ ...v, id: o.id, pricing_request_id: selected.id } as any)
                        }
                        onRecommend={(recommended) =>
                          saveOption.mutate({
                            id: o.id,
                            pricing_request_id: selected.id,
                            is_recommended: recommended,
                          } as any)
                        }
                        onDelete={() => deleteOption.mutate(o.id)}
                        canDelete={!isPublishedRequest}
                        deleteBlockedReason="لا يمكن الحذف بعد اعتماد التسعير"
                        requestValidUntil={validUntil || selected.price_valid_until || null}
                        onDirtyChange={(d) => setOfferDirty(o.id, d)}
                      />
                    ))}

                    {!list.length && (
                      <p className="text-xs text-muted-foreground">ابدأ بإضافة العرض الأول.</p>
                    )}
                  </CardContent>
                </Card>


                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">النشر للمبيعات</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">صلاحية التسعير حتى (اختياري)</Label>
                        <Input
                          type="date"
                          value={validUntil}
                          onChange={(e) => setValidUntil(e.target.value)}
                          onBlur={(e) => {
                            const val = e.target.value || null;
                            if (selected && val !== (selected.price_valid_until?.slice(0, 10) || null)) {
                              saveValidity.mutate({ requestId: selected.id, validUntil: val });
                            }
                          }}
                        />
                        <p className="text-[10px] text-muted-foreground">
                          اتركه فارغاً لو مش محتاجه — لن يمنع الاعتماد.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">توصية الحجوزات</Label>
                        <Input value={recommendation} onChange={(e) => setRecommendation(e.target.value)} />
                      </div>
                    </div>

                    {blockers.length > 0 ? (
                      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-2 text-xs space-y-1">
                        <p className="font-medium">ناقص قبل الاعتماد ({blockers.length}):</p>
                        <ul className="space-y-1">
                          {blockers.map((b) => <li key={b.code + b.message}>• {b.message}</li>)}
                        </ul>
                      </div>
                    ) : (
                      <p className="rounded-md border border-primary/40 bg-primary/5 p-2 text-xs">
                        ✓ كل المتطلبات مكتملة — يمكنك اعتماد التسعير وإرساله للمبيعات.
                      </p>
                    )}


                    <Button
                      size="sm"
                      onClick={() => publish.mutate({
                        requestId: selected.id,
                        validUntil: validUntil || suggestedValidUntil(list as any) || null,
                        recommendation,
                      })}

                      disabled={publish.isPending || blockers.length > 0}
                    >
                      {publish.isPending ? 'جارٍ الاعتماد…' : 'اعتماد التسعير وإرساله للمبيعات'}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      الاعتماد ينشئ عرض السعر ويعيد الطلب تلقائياً لموظف المبيعات صاحب الطلب في خطوة واحدة.
                    </p>


                    {(selected.status === 'quoted' || selected.status === 'requoted') && (
                      <div className="rounded-md border p-2 space-y-2">
                        <p className="text-xs text-muted-foreground">
                          تم الاعتماد. لو محتاج تعيد الإرسال لموظف المبيعات صاحب الطلب اضغط هنا.
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={returnToSales.isPending}
                          onClick={() => returnToSales.mutate(selected.id)}
                        >
                          إعادة الإرسال للمبيعات
                        </Button>
                      </div>
                    )}

                    {selected.status === 'recheck' && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-xs">إعادة التأكد من السعر والإتاحة قبل التحصيل</Label>
                          <div className="flex gap-2">
                            <Button
                              size="sm" variant="outline"
                              onClick={() => completeRecheck.mutate({ requestId: selected.id, changed: false })}
                            >
                              السعر والتوافر ثابت
                            </Button>
                            <Button
                              size="sm" variant="destructive"
                              onClick={() => {
                                const notes = window.prompt('ما الذي تغيّر؟') || '';
                                completeRecheck.mutate({ requestId: selected.id, changed: true, notes });
                              }}
                            >
                              تغير السعر / التوافر
                            </Button>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          <div>{lead && <SopLeadPanel leadId={lead.id} compact />}</div>
        </div>
      </div>
    </DepartmentGate>
  );
};

export default SopPricing;
