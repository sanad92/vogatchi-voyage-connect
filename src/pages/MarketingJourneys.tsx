import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Copy, Zap, Target, Users } from 'lucide-react';
import {
  useMarketingJourneys,
  useCloneJourneyTemplate,
  usePauseJourney,
  useUpsertJourney,
} from '@/hooks/useMarketingJourneys';

export default function MarketingJourneys() {
  const navigate = useNavigate();
  const journeysQuery = useMarketingJourneys();
  const { data: journeys = [], isLoading } = journeysQuery;
  const clone = useCloneJourneyTemplate();
  const pause = usePauseJourney();
  const upsert = useUpsertJourney();

  const templates = journeys.filter(j => j.is_template);
  const owned = journeys.filter(j => !j.is_template);

  const createBlank = () => {
    upsert.mutate({
      name: 'رحلة جديدة',
      category: 'custom',
      trigger_event: 'customer.created',
    }, { onSuccess: id => navigate(`/marketing/journeys/${id}`) });
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">أتمتة التسويق</h1>
          <p className="text-sm text-muted-foreground">
            صمّم رحلات العملاء واحفظها كمسودات. تشغيل الرحلات تلقائيًا غير متاح حاليًا.
          </p>
        </div>
        <Button onClick={createBlank} disabled={upsert.isPending} aria-label="إنشاء رحلة جديدة">
          <Plus className="w-4 h-4 me-2" />
          رحلة جديدة
        </Button>
      </header>

      <section aria-labelledby="active-journeys">
        <h2 id="active-journeys" className="text-lg font-semibold mb-4">رحلاتك</h2>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">جارٍ التحميل...</p>
        ) : journeysQuery.isError ? (
          <div className="space-y-2">
            <p role="alert">تعذّر تحميل الرحلات.</p>
            <Button variant="outline" onClick={() => void journeysQuery.refetch()}>إعادة المحاولة</Button>
          </div>
        ) : owned.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">
            لا توجد رحلات بعد — انسخ قالبًا من الأسفل أو أنشئ رحلة جديدة
          </CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {owned.map(j => (
              <Card key={j.id} className="hover:shadow-md transition cursor-pointer" onClick={() => navigate(`/marketing/journeys/${j.id}`)}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{j.name}</CardTitle>
                    {j.is_active ? (
                      <Button size="sm" variant="outline" disabled={pause.isPending} onClick={event => {
                        event.stopPropagation();
                        pause.mutate(j.id);
                      }}>إيقاف</Button>
                    ) : <Badge variant="outline">مسودة</Badge>}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{j.category}</Badge>
                    <Badge variant="secondary" className="text-xs gap-1"><Zap className="w-3 h-3" />{j.trigger_event}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div><Users className="w-4 h-4 mx-auto text-muted-foreground" /><div className="font-semibold mt-1">{j.stats?.enrolled ?? 0}</div><div className="text-muted-foreground">مسجل</div></div>
                  <div><Target className="w-4 h-4 mx-auto text-muted-foreground" /><div className="font-semibold mt-1">{j.stats?.goal_hit ?? 0}</div><div className="text-muted-foreground">هدف</div></div>
                  <div><Zap className="w-4 h-4 mx-auto text-muted-foreground" /><div className="font-semibold mt-1">{j.stats?.completed ?? 0}</div><div className="text-muted-foreground">مكتمل</div></div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="starter-templates">
        <h2 id="starter-templates" className="text-lg font-semibold mb-4">قوالب جاهزة</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <Card key={t.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t.name}</CardTitle>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </CardHeader>
              <CardContent className="flex items-center justify-between pt-2">
                <Badge variant="outline" className="text-xs">{t.trigger_event}</Badge>
                <Button size="sm" variant="secondary" onClick={() => clone.mutate(t.id)} aria-label={`نسخ قالب ${t.name}`}>
                  <Copy className="w-3 h-3 me-2" />نسخ
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
