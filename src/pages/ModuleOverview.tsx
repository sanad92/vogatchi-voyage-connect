import { useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, LockKeyhole, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import { ERP_MODULES, findModuleById } from '@/config/moduleNavigation';
import { MODULE_PULSE } from '@/config/modulePulse';
import { useNavigationAccess } from '@/hooks/useNavigationAccess';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useModulePulse, PULSE_RANGES, type PulseRangeKey } from '@/hooks/useModulePulse';
import ModuleKpiStrip from '@/components/modules/ModuleKpiStrip';
import ModuleFlowCard from '@/components/modules/ModuleFlowCard';
import ModuleAlerts from '@/components/modules/ModuleAlerts';
import ModuleActivityFeed from '@/components/modules/ModuleActivityFeed';
import { cn } from '@/lib/utils';

const ModuleOverview = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const module = findModuleById(moduleId);
  const { canAccessScreen } = useNavigationAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const rangeParam = (searchParams.get('range') as PulseRangeKey) || '30d';
  const [range, setRange] = useState<PulseRangeKey>(
    PULSE_RANGES.some((r) => r.key === rangeParam) ? rangeParam : '30d',
  );

  usePageTitle(module?.label || 'الموديولات');

  const { data: pulse, isLoading, isFetching, refetch } = useModulePulse(range);

  const visibleSections = useMemo(() => {
    if (!module) return [];
    return module.sections
      .map((section) => ({
        ...section,
        screens: section.screens.filter(canAccessScreen),
      }))
      .filter((section) => section.screens.length > 0);
  }, [canAccessScreen, module]);

  const pulseDef = module ? MODULE_PULSE[module.id] : undefined;

  const visibleKpis = useMemo(() => {
    if (!pulseDef) return [];
    return pulseDef.kpis.filter((kpi) => canAccessScreen({ ...(kpi as any), title: kpi.label, href: kpi.href ?? '#' }));
  }, [canAccessScreen, pulseDef]);

  if (!module) return <Navigate to="/dashboard" replace />;

  const ModuleIcon = module.icon as any;
  const visibleCount = visibleSections.reduce((total, section) => total + section.screens.length, 0);
  const current = pulse?.current ?? {};
  const previous = pulse?.previous ?? {};

  const changeRange = (key: PulseRangeKey) => {
    setRange(key);
    const next = new URLSearchParams(searchParams);
    next.set('range', key);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:px-8 space-y-6" dir="rtl">
      <PageHeader
        icon={ModuleIcon}
        title={module.label}
        description={module.description}
        badge={<Badge variant="outline">{visibleCount} شاشة متاحة</Badge>}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1.5 rounded-lg border bg-card p-1">
          {PULSE_RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => changeRange(r.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                range === r.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {pulse?.generated_at && (
            <span>آخر تحديث: {new Date(pulse.generated_at).toLocaleTimeString('ar-EG')}</span>
          )}
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn('h-3.5 w-3.5 ml-1.5', isFetching && 'animate-spin')} />
            تحديث
          </Button>
        </div>
      </div>

      {pulseDef && (
        <ModuleKpiStrip
          metrics={visibleKpis}
          current={current}
          previous={previous}
          loading={isLoading}
        />
      )}

      {pulseDef && (
        <ModuleFlowCard
          flow={pulseDef.flow}
          receives={module.receives}
          delivers={module.delivers}
          current={current}
        />
      )}

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="الموديولات الرئيسية">
        {ERP_MODULES.map((item) => {
          const Icon = item.icon as any;
          const active = item.id === module.id;
          return (
            <Link
              key={item.id}
              to={`${item.overviewHref}?range=${range}`}
              className={cn(
                'inline-flex min-w-fit items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.shortLabel}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <ModuleAlerts
          moduleId={module.id}
          alerts={pulse?.alerts ?? []}
          canAccess={(def) => canAccessScreen({ ...(def as any), title: def.label })}
        />
        <ModuleActivityFeed activity={pulse?.activity ?? []} moduleId={module.id} />
      </div>

      {visibleSections.length > 0 ? (
        <div className="space-y-8">
          {visibleSections.map((section) => (
            <section key={section.title} className="space-y-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{section.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {section.screens.map((screen) => {
                  const ScreenIcon = screen.icon as any;
                  return (
                    <Link key={screen.href} to={screen.href} className="group block h-full">
                      <Card className="h-full transition-all group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:shadow-sm">
                        <CardContent className="flex h-full items-start gap-3 p-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-primary/15 bg-primary/10 text-primary">
                            <ScreenIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-sm text-foreground">{screen.title}</h3>
                              {screen.badge && <Badge className="text-[9px] px-1.5 py-0">{screen.badge}</Badge>}
                            </div>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{screen.description}</p>
                          </div>
                          <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-x-0.5 group-hover:text-primary" />
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex min-h-48 flex-col items-center justify-center text-center p-6">
            <LockKeyhole className="h-9 w-9 text-muted-foreground mb-3" />
            <h2 className="font-semibold">لا توجد شاشات متاحة لك داخل هذا الموديول</h2>
            <p className="mt-1 text-sm text-muted-foreground">راجع دورك وصلاحياتك أو تواصل مع مدير المؤسسة.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/dashboard"><ArrowLeft className="h-4 w-4 ml-2" />العودة إلى لوحة التحكم</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ModuleOverview;
