import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import SopLeadPanel from '@/components/sop/SopLeadPanel';
import { useReopenLead, useSopLeads, useSopRealtime, type SopLead } from '@/hooks/useSop';
import { LEAD_STAGE_LABELS, PIPELINE_STAGES, type SopLeadStage } from '@/lib/sop';
import { usePageTitle } from '@/hooks/usePageTitle';

const SopPipeline = () => {
  usePageTitle('خط أنابيب المبيعات');
  useSopRealtime();
  const { data: leads } = useSopLeads({
    stages: [...PIPELINE_STAGES, 'lost'] as SopLeadStage[],
  });
  const reopen = useReopenLead();
  const [selected, setSelected] = useState<string | null>(null);

  const columns = useMemo(() => {
    const map: Record<string, SopLead[]> = {};
    PIPELINE_STAGES.forEach((s) => { map[s] = []; });
    (leads || []).forEach((l) => {
      if (map[l.stage]) map[l.stage].push(l);
    });
    return map;
  }, [leads]);

  const lost = (leads || []).filter((l) => l.stage === 'lost');

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <header>
        <h1 className="text-2xl font-bold">خط أنابيب المبيعات</h1>
        <p className="text-sm text-muted-foreground">
          مؤهل ← طلب تسعير ← عرض سعر ← متابعة ← موافقة بانتظار إعادة التأكد ← تمت إعادة التأكد ← تحصيل ← محجوز
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3 overflow-x-auto">
          <div className="flex gap-3 min-w-max pb-2">
            {PIPELINE_STAGES.map((stage) => (
              <div key={stage} className="w-64 shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{LEAD_STAGE_LABELS[stage as SopLeadStage]}</span>
                  <Badge variant="outline">{columns[stage]?.length || 0}</Badge>
                </div>
                <div className="space-y-2">
                  {(columns[stage] || []).map((l) => (
                    <Card
                      key={l.id}
                      className={`cursor-pointer transition ${selected === l.id ? 'ring-1 ring-primary' : ''}`}
                      onClick={() => setSelected(l.id)}
                    >
                      <CardContent className="p-3 space-y-1">
                        <div className="text-sm font-medium">{l.contact_name || '—'}</div>
                        <div className="text-xs text-muted-foreground">{l.destination || l.city || '—'}</div>
                        <div className="flex flex-wrap gap-1">
                          {l.stage === 'quoted' && (
                            <Badge className="text-[10px]">تم التسعير</Badge>
                          )}
                          {l.stage === 'pricing_requested' && (
                            <Badge variant="secondary" className="text-[10px]">بانتظار التسعير</Badge>
                          )}
                          {l.requote_required && <Badge variant="destructive" className="text-[10px]">إعادة تسعير</Badge>}
                          {l.budget_level && <Badge variant="outline" className="text-[10px]">{l.budget_level}</Badge>}
                        </div>
                      </CardContent>

                    </Card>
                  ))}
                  {!columns[stage]?.length && (
                    <div className="text-xs text-muted-foreground border border-dashed rounded-md p-3 text-center">
                      لا يوجد
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {lost.length > 0 && (
            <Card className="mt-4">
              <CardHeader className="pb-2"><CardTitle className="text-sm">غير مؤهل / مفقود ({lost.length})</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {lost.slice(0, 10).map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-2 text-xs border rounded p-2">
                    <span>{l.contact_name || '—'}</span>
                    <span className="text-muted-foreground flex-1 truncate">{l.lost_reason || 'بدون سبب مسجل'}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px]"
                      disabled={reopen.isPending}
                      onClick={() => reopen.mutate(l.id)}
                    >
                      إعادة فتح
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div>
          {selected ? (
            <SopLeadPanel leadId={selected} />
          ) : (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">
              اختر ملفاً لعرض الإجراء المطلوب والقيود.
            </CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SopPipeline;
