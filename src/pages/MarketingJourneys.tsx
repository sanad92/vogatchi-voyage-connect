import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Copy, Zap, Target, Users } from 'lucide-react';
import {
  useMarketingJourneys,
  useCloneJourneyTemplate,
  useToggleJourney,
  useUpsertJourney,
} from '@/hooks/useMarketingJourneys';

export default function MarketingJourneys() {
  const navigate = useNavigate();
  const { data: journeys = [], isLoading } = useMarketingJourneys();
  const clone = useCloneJourneyTemplate();
  const toggle = useToggleJourney();
  const upsert = useUpsertJourney();

  const templates = journeys.filter(j => j.is_template);
  const owned = journeys.filter(j => !j.is_template);

  const createBlank = async () => {
    const id = await upsert.mutateAsync({
      name: 'رحلة جديدة',
      category: 'custom',
      trigger_event: 'customer.created',
    });
    navigate(`/marketing/journeys/${id}`);
  };

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-8 space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">أتمتة التسويق</h1>
          <p className="text-sm text-muted-foreground">
            رحلات آلية للعملاء عبر واتساب والبريد — من الترحيب حتى الولاء
          </p>
        </div>
        <Button onClick={createBlank} aria-label="إنشاء رحلة جديدة">
          <Plus className="w-4 h-4 me-2" />
          رحلة جديدة
        </Button>
      </header>

      <section aria-labelledby="active-journeys">
        <h2 id="active-journeys" className="text-lg font-semibold mb-4">رحلاتك</h2>
        {isLoading ? (
          <p className="text-muted-foreground text-sm">جارٍ التحميل...</p>
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
                    <Switch
                      checked={j.is_active}
                      onClick={e => e.stopPropagation()}
                      onCheckedChange={v => toggle.mutate({ id: j.id, is_active: v })}
                      aria-label={j.is_active ? 'إيقاف' : 'تفعيل'}
                    />
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
