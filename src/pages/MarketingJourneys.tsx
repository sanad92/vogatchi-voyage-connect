import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Copy, Zap, Users } from 'lucide-react';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import {
  useMarketingJourneys,
  useCloneJourneyTemplate,
  useSetJourneyActive,
  useUpsertJourney,
} from '@/hooks/useMarketingJourneys';

export default function MarketingJourneys() {
  const navigate = useNavigate();
  const journeysQuery = useMarketingJourneys();
  const { data: journeys = [], isLoading } = journeysQuery;
  const clone = useCloneJourneyTemplate();
  const setActive = useSetJourneyActive();
  const upsert = useUpsertJourney();
  const permissions = useSupabasePermissions();
  const canManage = permissions.getPermissionScope('marketing_edit') === 'organization';

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
            شغّل متابعة داخلية للعملاء الجدد. الإرسال الخارجي من الرحلات غير متاح حاليًا.
          </p>
        </div>
        {canManage && (
          <Button onClick={createBlank} disabled={upsert.isPending} aria-label="إنشاء رحلة جديدة">
            <Plus className="w-4 h-4 me-2" />
            رحلة جديدة
          </Button>
        )}
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
            {owned.map(j => {
              const active = Boolean(j.is_active && j.runtime_enabled_at);
              return (
              <Card key={j.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">
                      {canManage ? <Link className="hover:underline" to={`/marketing/journeys/${j.id}`}>{j.name}</Link> : j.name}
                    </CardTitle>
                    <Badge variant={active ? 'default' : 'outline'}>
                      {active ? 'تعمل' : j.runtime_enabled_at ? 'متوقفة' : 'مسودة'}
                    </Badge>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{j.category}</Badge>
                    <Badge variant="secondary" className="text-xs gap-1"><Zap className="w-3 h-3" />{j.trigger_event}</Badge>
                  </div>
                </CardHeader>
                {j.runtime_enabled_at && (
                  <CardContent className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div><Users className="w-4 h-4 mx-auto text-muted-foreground" /><div className="font-semibold mt-1">{j.stats?.enrolled ?? 0}</div><div className="text-muted-foreground">مسجل</div></div>
                    <div><Zap className="w-4 h-4 mx-auto text-muted-foreground" /><div className="font-semibold mt-1">{j.stats?.completed ?? 0}</div><div className="text-muted-foreground">مكتمل</div></div>
                  </CardContent>
                )}
                {canManage && (
                  <div className="px-6 pb-4 flex justify-end">
                    <Button size="sm" variant="outline" disabled={setActive.isPending}
                      onClick={() => setActive.mutate({ id: j.id, enabled: !active })}>
                      {active ? 'إيقاف' : j.runtime_enabled_at ? 'استئناف' : 'تشغيل'}
                    </Button>
                  </div>
                )}
              </Card>
              );
            })}
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
                {canManage && (
                  <Button size="sm" variant="secondary" onClick={() => clone.mutate(t.id)} aria-label={`نسخ قالب ${t.name}`}>
                    <Copy className="w-3 h-3 me-2" />نسخ
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
