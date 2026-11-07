import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, ShieldCheck, Play, Clock3, CheckCircle2, XCircle, ArrowRight, Workflow, ClipboardList, LockKeyhole } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { simulateFlow, validateFlowTemplate, type FlowPreview } from '@/lib/safarFlow/engine';
import { SAFAR_FLOW_TEMPLATES, SAFAR_FLOW_SAMPLES } from '@/lib/safarFlow/templates';
import { SafarFlowLiveFollowups } from '@/components/safar-flow/SafarFlowLiveFollowups';
import { SafarFlowQueueHealth } from '@/components/safar-flow/SafarFlowQueueHealth';
import { SafarFlowAlerts } from '@/components/safar-flow/SafarFlowAlerts';

const CATEGORY_LABELS: Record<string, string> = {
  sales: 'المبيعات', operations: 'التشغيل', finance: 'الحسابات', ai: 'الذكاء الاصطناعي',
};

const delayLabel = (minutes: number) => {
  if (minutes === 0) return 'بدون انتظار';
  if (minutes % 1440 === 0) return String(minutes / 1440) + ' يوم';
  if (minutes % 60 === 0) return String(minutes / 60) + ' ساعات';
  return String(minutes) + ' دقيقة';
};

const SafarFlowStudio = () => {
  const [templateId, setTemplateId] = useState(SAFAR_FLOW_TEMPLATES[0].id);
  const template = SAFAR_FLOW_TEMPLATES.find(t => t.id === templateId) || SAFAR_FLOW_TEMPLATES[0];
  const samples = useMemo(() => SAFAR_FLOW_SAMPLES.filter(s => s.type === template.trigger), [template.trigger]);
  const [sampleId, setSampleId] = useState(SAFAR_FLOW_SAMPLES[0].id);
  const sample = samples.find(s => s.id === sampleId) || samples[0];
  const [preview, setPreview] = useState<FlowPreview | null>(null);
  const issues = useMemo(() => validateFlowTemplate(template), [template]);

  const selectTemplate = (id: string) => {
    setTemplateId(id);
    const next = SAFAR_FLOW_TEMPLATES.find(t => t.id === id);
    setSampleId(SAFAR_FLOW_SAMPLES.find(s => s.type === next?.trigger)?.id || '');
    setPreview(null);
  };

  return (
    <div dir="rtl" className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Workflow className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Safar Flow Studio</h1>
            <Badge variant="secondary">محاكاة + مراقبة قراءة فقط</Badge>
          </div>
          <p className="text-sm text-muted-foreground max-w-3xl">
            مكتبة لأتمتة عمليات شركات السياحة، مع محاكاة القواعد على بيانات افتراضية ومراقبة حالة المهام المسجلة لشركتك عند توفر قاعدة البيانات.
            الشاشة لا ترسل واتساب أو بريدًا، ولا تنفذ حجوزات أو مدفوعات أو تعيد تشغيل المهام.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/automation"><ArrowRight className="w-4 h-4 ml-1" /> قواعد الأتمتة الحالية</Link>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card><CardContent className="pt-5 flex gap-3 items-center">
          <Zap className="w-6 h-6 text-primary" />
          <div><p className="text-xl font-bold">{SAFAR_FLOW_TEMPLATES.length}</p><p className="text-xs text-muted-foreground">قوالب جاهزة للمعاينة</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-5 flex gap-3 items-center">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <div><p className="font-semibold">بدون تعديلات فعلية</p><p className="text-xs text-muted-foreground">المحاكاة لا تكتب في قاعدة البيانات</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-5 flex gap-3 items-center">
          <LockKeyhole className="w-6 h-6 text-amber-600" />
          <div><p className="font-semibold">التفعيل مؤجل</p><p className="text-xs text-muted-foreground">حتى اختبار المحرك والصلاحيات</p></div>
        </CardContent></Card>
      </div>

      <SafarFlowLiveFollowups />
      <SafarFlowQueueHealth />
      <SafarFlowAlerts />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">مكتبة Workflows</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {SAFAR_FLOW_TEMPLATES.map(t => (
              <button
                key={t.id} type="button"
                className={'w-full text-right p-3 border rounded-lg transition-colors ' +
                  (t.id === template.id ? 'border-primary bg-primary/5' : 'hover:bg-muted/60')}
                onClick={() => selectTemplate(t.id)}
                aria-pressed={t.id === template.id}
              >
                <div className="font-semibold text-sm">{t.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{CATEGORY_LABELS[t.category]}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <CardTitle>{template.title}</CardTitle>
                <Badge variant="outline">{CATEGORY_LABELS[template.category]}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{template.description}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-3 flex flex-wrap gap-3 items-center">
                <Zap className="w-5 h-5 text-primary" />
                <span className="font-medium">الحدث:</span>
                <code dir="ltr" className="text-xs bg-muted rounded px-2 py-1">{template.trigger}</code>
                <Clock3 className="w-4 h-4 text-muted-foreground mr-auto" />
                <span className="text-sm">{delayLabel(template.delayMinutes)}</span>
              </div>

              {template.recheckAfterDelay && (
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  يجب إعادة فحص حالة العميل أو الحجز وقت التنفيذ، وليس الاعتماد على البيانات القديمة.
                </p>
              )}

              <div className="space-y-2">
                <div className="font-medium text-sm">الشروط المطلوبة</div>
                {template.conditions.map((condition, i) => (
                  <div key={i} dir="ltr" className="font-mono text-xs bg-muted/60 p-2 rounded-md text-left">
                    {condition.path} {condition.operator} {JSON.stringify(condition.value)}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <div className="font-medium text-sm">الإجراءات المخططة</div>
                {template.actions.map((action, i) => (
                  <div key={action.id} className="border rounded-md p-3 flex items-center gap-3 text-sm">
                    <span className="rounded-full bg-muted w-6 h-6 flex items-center justify-center text-xs">{i + 1}</span>
                    <span className="flex-1">{action.label}</span>
                    {action.reviewRequired && <Badge variant="secondary">مراجعة بشرية</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="w-4 h-4" /> تجربة محاكاة</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">اختر حدثًا افتراضيًا ثم افحص هل شروط القالب تنطبق، وما الإجراءات المقترحة. لا تُستخدم بيانات حقيقية.</p>
              <Select value={sample.id} onValueChange={v => { setSampleId(v); setPreview(null); }}>
                <SelectTrigger aria-label="السيناريو التجريبي"><SelectValue placeholder="اختر السيناريو" /></SelectTrigger>
                <SelectContent>
                  {samples.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button disabled={issues.length > 0 || !sample} onClick={() => setPreview(simulateFlow(template, sample))}>
                <Play className="w-4 h-4 ml-2" /> تشغيل المحاكاة
              </Button>
              {issues.length > 0 && <p className="text-sm text-destructive">خطأ في تعريف القالب: {issues.join('، ')}</p>}
              {preview && (
                <div className="rounded-lg border p-4 space-y-3" role="status" aria-live="polite">
                  <div className="flex gap-2 items-center font-semibold">
                    {preview.matched
                      ? <><CheckCircle2 className="w-5 h-5 text-emerald-600" /> الشروط متحققة — محاكاة ناجحة</>
                      : <><XCircle className="w-5 h-5 text-muted-foreground" /> الشروط غير متحققة — لن تُشغل الإجراءات</>}
                  </div>
                  {preview.matched && (
                    <>
                      {preview.delayMinutes > 0 && <p className="text-sm">المحرك الفعلي سيحتاج جدولة بعد {delayLabel(preview.delayMinutes)}.</p>}
                      {preview.recheckAfterDelay && <p className="text-sm">قبل التشغيل الفعلي يجب إعادة التحقق من أحدث حالة للملف.</p>}
                      {preview.actions.map(action => (
                        <div key={action.id} className="text-sm flex gap-2 items-center">
                          <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                          <span>{action.label}</span>
                          {action.reviewRequired && <Badge variant="outline">يحتاج اعتمادًا</Badge>}
                        </div>
                      ))}
                    </>
                  )}
                  <p className="text-xs text-muted-foreground">هذه معاينة للمنطق فقط. لم يتم تنفيذ أي إجراء فعلي.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SafarFlowStudio;
