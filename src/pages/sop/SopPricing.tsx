import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2 } from 'lucide-react';
import {
  useCompleteRecheck,
  useDeletePricingOption,
  usePricingOptions,
  usePricingRequests,
  usePublishPricing,
  useSavePricingOption,
  useSopLead,
  useSopRealtime,
  type SopPricingOption,
} from '@/hooks/useSop';
import SopLeadPanel from '@/components/sop/SopLeadPanel';
import DepartmentGate from '@/components/sop/DepartmentGate';
import { usePageTitle } from '@/hooks/usePageTitle';

const STATUS_LABELS: Record<string, string> = {
  requested: 'مطلوب',
  in_progress: 'قيد التسعير',
  quoted: 'تم التسعير',
  recheck_requested: 'مطلوب إعادة تأكد',
  recheck_done: 'تمت إعادة التأكد',
  closed: 'مغلق',
};

const SopPricing = () => {
  usePageTitle('طلبات التسعير — الحجوزات');
  useSopRealtime();
  const { data: requests } = usePricingRequests();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = (requests || []).find((r) => r.id === selectedId) || null;
  const { data: options } = usePricingOptions(selectedId);
  const { data: lead } = useSopLead(selected?.lead_id);

  const saveOption = useSavePricingOption();
  const deleteOption = useDeletePricingOption();
  const publish = usePublishPricing();
  const completeRecheck = useCompleteRecheck();

  const [validUntil, setValidUntil] = useState('');
  const [recommendation, setRecommendation] = useState('');

  useEffect(() => {
    setValidUntil(selected?.price_valid_until?.slice(0, 10) || '');
    setRecommendation(selected?.recommendation || '');
  }, [selectedId, selected?.price_valid_until, selected?.recommendation]);

  const addOption = () => {
    if (!selectedId) return;
    saveOption.mutate({
      pricing_request_id: selectedId,
      option_index: (options?.length || 0) + 1,
      net_cost: 0,
      selling_price: 0,
      currency: 'EGP',
      markup_type: 'percent',
      markup_value: 0,
    } as any);
  };

  return (
    <DepartmentGate department="reservations">
      <div className="p-6 space-y-4" dir="rtl">
        <header>
          <h1 className="text-2xl font-bold">مساحة عمل الحجوزات</h1>
          <p className="text-sm text-muted-foreground">
            حد أقصى 3 خيارات لكل طلب، مع صافي التكلفة وسياسة الإلغاء وصلاحية السعر
          </p>
        </header>

        <div className="grid gap-4 lg:grid-cols-4">
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2"><CardTitle className="text-sm">الطلبات</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {(requests || []).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-right border rounded-md p-2 text-xs transition ${
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
                </button>
              ))}
              {!requests?.length && <p className="text-xs text-muted-foreground">لا توجد طلبات تسعير.</p>}
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {!selected && (
              <Card><CardContent className="p-6 text-sm text-muted-foreground">اختر طلب تسعير للبدء.</CardContent></Card>
            )}

            {selected && (
              <>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">ملخص الطلب (Brief)</CardTitle></CardHeader>
                  <CardContent className="grid gap-2 sm:grid-cols-2 text-xs">
                    {Object.entries((selected.brief as Record<string, unknown>) || {}).map(([k, v]) => (
                      <div key={k} className="flex justify-between border-b py-1">
                        <span className="text-muted-foreground">{k}</span>
                        <span>{v === null || v === '' ? '—' : String(v)}</span>
                      </div>
                    ))}
                    {selected.notes && <div className="sm:col-span-2">ملاحظات المبيعات: {selected.notes}</div>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm">الخيارات ({options?.length || 0}/3)</CardTitle>
                    <Button size="sm" variant="outline" onClick={addOption} disabled={(options?.length || 0) >= 3}>
                      <Plus className="h-3.5 w-3.5 ml-1" /> خيار
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(options || []).map((o) => (
                      <OptionEditor
                        key={o.id}
                        option={o}
                        onSave={(v) => saveOption.mutate({ ...v, id: o.id, pricing_request_id: selected.id } as any)}
                        onDelete={() => deleteOption.mutate(o.id)}
                      />
                    ))}
                    {!options?.length && <p className="text-xs text-muted-foreground">أضف خياراً واحداً على الأقل.</p>}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">النشر للمبيعات</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">صلاحية السعر حتى</Label>
                        <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">توصية الحجوزات</Label>
                        <Input value={recommendation} onChange={(e) => setRecommendation(e.target.value)} />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => publish.mutate({
                        requestId: selected.id,
                        validUntil: validUntil || null,
                        recommendation,
                      })}
                      disabled={publish.isPending}
                    >
                      نشر التسعير وإنشاء عرض السعر
                    </Button>

                    {selected.status === 'recheck_requested' && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <Label className="text-xs">إعادة التأكد من السعر والإتاحة قبل التحصيل</Label>
                          <div className="flex gap-2">
                            <Button
                              size="sm" variant="outline"
                              onClick={() => completeRecheck.mutate({ requestId: selected.id, changed: false })}
                            >
                              مؤكد بدون تغيير
                            </Button>
                            <Button
                              size="sm" variant="destructive"
                              onClick={() => {
                                const notes = window.prompt('ما الذي تغيّر؟') || '';
                                completeRecheck.mutate({ requestId: selected.id, changed: true, notes });
                              }}
                            >
                              تغيّر السعر / الإتاحة
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

interface OptionEditorProps {
  option: SopPricingOption;
  onSave: (values: Partial<SopPricingOption>) => void;
  onDelete: () => void;
}

const Field = ({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">
      {label}{required && <span className="text-destructive"> *</span>}
    </Label>
    {children}
  </div>
);

const OptionEditor = ({ option, onSave, onDelete }: OptionEditorProps) => {
  const [v, setV] = useState<Partial<SopPricingOption>>(option);
  useEffect(() => setV(option), [option]);
  const set = (k: keyof SopPricingOption, val: unknown) => setV((p) => ({ ...p, [k]: val }));
  const margin = `${((Number(v.selling_price) || 0) - (Number(v.net_cost) || 0)).toLocaleString('en-US')} ${v.currency || 'EGP'}`;


  return (
    <div className="border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">خيار {option.option_index}</span>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs">
            <Switch checked={!!v.is_recommended} onCheckedChange={(c) => set('is_recommended', c)} />
            موصى به
          </label>
          <Button size="icon" variant="ghost" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="المورد" required>
          <Input placeholder="مثال: فندق ماريوت" value={v.supplier_name || ''} onChange={(e) => set('supplier_name', e.target.value)} />
        </Field>
        <Field label="المنتج / الفندق" required>
          <Input placeholder="اسم المنتج أو الفندق" value={v.product_name || ''} onChange={(e) => set('product_name', e.target.value)} />
        </Field>
        <Field label="العملة" required>
          <Input placeholder="EGP" value={v.currency || 'EGP'} onChange={(e) => set('currency', e.target.value)} />
        </Field>
        <Field label="صافي التكلفة" required>
          <Input type="number" inputMode="decimal" placeholder="0.00" value={v.net_cost ?? ''} onChange={(e) => set('net_cost', Number(e.target.value))} />
        </Field>
        <Field label="سعر البيع" required>
          <Input type="number" inputMode="decimal" placeholder="0.00" value={v.selling_price ?? ''} onChange={(e) => set('selling_price', Number(e.target.value))} />
        </Field>
        <Field label="هامش الربح">
          <Input readOnly disabled value={margin} />
        </Field>
        <Field label="موعد السداد للمورد">
          <Input type="date" value={v.payment_deadline?.slice(0, 10) || ''} onChange={(e) => set('payment_deadline', e.target.value || null)} />
        </Field>
        <Field label="آخر موعد للإلغاء">
          <Input type="date" value={v.cancellation_deadline?.slice(0, 10) || ''} onChange={(e) => set('cancellation_deadline', e.target.value || null)} />
        </Field>
        <Field label="موعد الإفراج (Release)">
          <Input type="date" value={v.release_deadline?.slice(0, 10) || ''} onChange={(e) => set('release_deadline', e.target.value || null)} />
        </Field>
      </div>
      <Field label="سياسة الإلغاء" required>
        <Textarea
          rows={2} placeholder="اكتب سياسة الإلغاء كما وردت من المورد"
          value={v.cancellation_policy || ''} onChange={(e) => set('cancellation_policy', e.target.value)}
        />
      </Field>

      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => onSave(v)}>حفظ الخيار</Button>
      </div>
    </div>
  );
};

export default SopPricing;
