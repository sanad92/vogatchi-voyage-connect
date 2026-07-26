import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown, Save } from 'lucide-react';
import {
  useJourney,
  useUpsertJourney,
  useSaveJourneySteps,
  useJourneyAnalytics,
  type JourneyStep,
} from '@/hooks/useMarketingJourneys';

const STEP_TYPES: { value: JourneyStep['step_type']; label: string }[] = [
  { value: 'send_whatsapp', label: 'إرسال واتساب' },
  { value: 'send_email', label: 'إرسال بريد' },
  { value: 'wait', label: 'انتظار' },
  { value: 'tag', label: 'إضافة وسم' },
  { value: 'emit_event', label: 'إطلاق حدث' },
  { value: 'exit', label: 'إنهاء الرحلة' },
];

export default function JourneyEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useJourney(id);
  const analytics = useJourneyAnalytics(id);
  const upsert = useUpsertJourney();
  const saveSteps = useSaveJourneySteps();

  const [meta, setMeta] = useState({ name: '', description: '', trigger_event: 'customer.created', goal_event: '', category: 'custom' });
  const [steps, setSteps] = useState<Partial<JourneyStep>[]>([]);

  useEffect(() => {
    if (data?.journey) {
      setMeta({
        name: data.journey.name,
        description: data.journey.description ?? '',
        trigger_event: data.journey.trigger_event,
        goal_event: data.journey.goal_event ?? '',
        category: data.journey.category,
      });
      setSteps(data.steps);
    }
  }, [data]);

  const addStep = () => setSteps([...steps, { step_type: 'send_whatsapp', config: {}, delay_minutes: 0 }]);
  const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i));
  const moveStep = (i: number, dir: -1 | 1) => {
    const next = [...steps];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setSteps(next);
  };
  const updateStep = (i: number, patch: Partial<JourneyStep>) => {
    const next = [...steps];
    next[i] = { ...next[i], ...patch };
    setSteps(next);
  };

  const saveAll = async () => {
    if (!id) return;
    await upsert.mutateAsync({ id, ...meta, goal_event: meta.goal_event || null });
    await saveSteps.mutateAsync({ journeyId: id, steps });
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">جارٍ التحميل...</div>;

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8 space-y-6">
      <header className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketing/journeys')} aria-label="رجوع">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{meta.name || 'رحلة بدون اسم'}</h1>
            <p className="text-xs text-muted-foreground">تصميم خطوات الأتمتة</p>
          </div>
        </div>
        <Button onClick={saveAll} disabled={saveSteps.isPending || upsert.isPending}>
          <Save className="w-4 h-4 me-2" />حفظ
        </Button>
      </header>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">التكوين</TabsTrigger>
          <TabsTrigger value="steps">الخطوات ({steps.length})</TabsTrigger>
          <TabsTrigger value="analytics">التحليلات</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4 mt-4">
          <Card><CardContent className="p-6 space-y-4">
            <div><Label>الاسم</Label><Input value={meta.name} onChange={e => setMeta({ ...meta, name: e.target.value })} /></div>
            <div><Label>الوصف</Label><Textarea value={meta.description} onChange={e => setMeta({ ...meta, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>حدث التسجيل</Label><Input value={meta.trigger_event} onChange={e => setMeta({ ...meta, trigger_event: e.target.value })} placeholder="customer.created" /></div>
              <div><Label>حدث الهدف (اختياري)</Label><Input value={meta.goal_event} onChange={e => setMeta({ ...meta, goal_event: e.target.value })} placeholder="booking.created" /></div>
            </div>
            <div><Label>الفئة</Label><Input value={meta.category} onChange={e => setMeta({ ...meta, category: e.target.value })} /></div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="steps" className="mt-4 space-y-3">
          {steps.map((s, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div className="flex items-center gap-2">
                  <Badge>{i + 1}</Badge>
                  <CardTitle className="text-sm">{STEP_TYPES.find(t => t.value === s.step_type)?.label}</CardTitle>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => moveStep(i, -1)} aria-label="أعلى"><ChevronUp className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => moveStep(i, 1)} aria-label="أسفل"><ChevronDown className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => removeStep(i)} aria-label="حذف"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">النوع</Label>
                    <Select value={s.step_type} onValueChange={v => updateStep(i, { step_type: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STEP_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">تأخير (دقائق)</Label>
                    <Input type="number" min={0} value={s.delay_minutes ?? 0} onChange={e => updateStep(i, { delay_minutes: parseInt(e.target.value) || 0 })} />
                  </div>
                </div>
                {(s.step_type === 'send_whatsapp' || s.step_type === 'send_email') && (
                  <>
                    {s.step_type === 'send_email' && (
                      <div><Label className="text-xs">الموضوع</Label><Input value={s.config?.subject ?? ''} onChange={e => updateStep(i, { config: { ...s.config, subject: e.target.value } })} /></div>
                    )}
                    <div>
                      <Label className="text-xs">{s.step_type === 'send_email' ? 'المحتوى' : 'الرسالة'}</Label>
                      <Textarea
                        rows={4}
                        value={s.config?.[s.step_type === 'send_email' ? 'body' : 'message'] ?? ''}
                        onChange={e => updateStep(i, { config: { ...s.config, [s.step_type === 'send_email' ? 'body' : 'message']: e.target.value } })}
                        placeholder="استخدم {{name}} {{phone}} كمتغيرات"
                      />
                      <p className="text-xs text-muted-foreground mt-1">المتغيرات المتاحة: بيانات العميل ({'{{name}}, {{email}}, {{phone}}'})</p>
                    </div>
                  </>
                )}
                {s.step_type === 'emit_event' && (
                  <div><Label className="text-xs">اسم الحدث</Label><Input value={s.config?.event ?? ''} onChange={e => updateStep(i, { config: { ...s.config, event: e.target.value } })} /></div>
                )}
                {s.step_type === 'tag' && (
                  <div><Label className="text-xs">الوسم</Label><Input value={s.config?.tag ?? ''} onChange={e => updateStep(i, { config: { ...s.config, tag: e.target.value } })} /></div>
                )}
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addStep} className="w-full"><Plus className="w-4 h-4 me-2" />إضافة خطوة</Button>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <Card><CardContent className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {[
              ['إجمالي', analytics.data?.total ?? 0],
              ['نشط', analytics.data?.active ?? 0],
              ['مكتمل', analytics.data?.completed ?? 0],
              ['وصل للهدف', analytics.data?.goal_hit ?? 0],
            ].map(([label, val]) => (
              <div key={label as string}>
                <div className="text-3xl font-bold">{val as number}</div>
                <div className="text-sm text-muted-foreground mt-1">{label}</div>
              </div>
            ))}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
