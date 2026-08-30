import { useMemo } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, ChevronLeft, LockKeyhole } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import PageHeader from '@/components/layout/PageHeader';
import { ERP_MODULES, findModuleById } from '@/config/moduleNavigation';
import { useNavigationAccess } from '@/hooks/useNavigationAccess';
import { usePageTitle } from '@/hooks/usePageTitle';
import { cn } from '@/lib/utils';

const ModuleOverview = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const module = findModuleById(moduleId);
  const { canAccessScreen } = useNavigationAccess();

  usePageTitle(module?.label || 'الموديولات');

  const visibleSections = useMemo(() => {
    if (!module) return [];
    return module.sections
      .map((section) => ({
        ...section,
        screens: section.screens.filter(canAccessScreen),
      }))
      .filter((section) => section.screens.length > 0);
  }, [canAccessScreen, module]);

  if (!module) return <Navigate to="/dashboard" replace />;

  const ModuleIcon = module.icon as any;
  const visibleCount = visibleSections.reduce((total, section) => total + section.screens.length, 0);

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:px-8 space-y-6" dir="rtl">
      <PageHeader
        icon={ModuleIcon}
        title={module.label}
        description={module.description}
        badge={<Badge variant="outline">{visibleCount} شاشة متاحة</Badge>}
      />

      <Card className="overflow-hidden border-primary/15 bg-gradient-to-l from-primary/[0.08] via-card to-card">
        <CardContent className="p-5 md:p-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="rounded-xl border bg-background/75 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">يستلم</p>
              <p className="text-sm font-medium leading-relaxed">{module.receives}</p>
            </div>
            <div className="hidden md:flex h-10 w-10 items-center justify-center rounded-full border bg-background text-primary">
              <ArrowLeftRight className="h-4 w-4" />
            </div>
            <div className="rounded-xl border bg-background/75 p-4">
              <p className="text-xs font-semibold text-muted-foreground mb-1">يسلّم</p>
              <p className="text-sm font-medium leading-relaxed">{module.delivers}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2 overflow-x-auto pb-1" aria-label="الموديولات الرئيسية">
        {ERP_MODULES.map((item) => {
          const Icon = item.icon;
          const active = item.id === module.id;
          return (
            <Link
              key={item.id}
              to={item.overviewHref}
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
                  const ScreenIcon = screen.icon;
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

