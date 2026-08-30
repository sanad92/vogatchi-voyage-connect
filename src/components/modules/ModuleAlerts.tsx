import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronLeft } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MODULE_ALERTS, type AlertDef } from '@/config/modulePulse';
import type { PulseAlert } from '@/hooks/useModulePulse';
import type { ModuleId } from '@/config/moduleNavigation';

interface Props {
  moduleId: ModuleId;
  alerts: PulseAlert[];
  canAccess: (def: AlertDef) => boolean;
}

const ModuleAlerts = ({ moduleId, alerts, canAccess }: Props) => {
  const defs = MODULE_ALERTS.filter((d) => d.module === moduleId && canAccess(d));
  if (defs.length === 0) return null;

  const countOf = (key: string) => Number(alerts.find((a) => a.key === key)?.count ?? 0);
  const breaks = defs.filter((d) => countOf(d.key) > 0);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">سلامة الترابط مع الموديولات الأخرى</h2>
        <p className="mt-1 text-sm text-muted-foreground">سجلات عالقة عند حدود هذا الموديول ولم تنتقل للخطوة التالية.</p>
      </div>

      {breaks.length === 0 ? (
        <Card className="border-emerald-500/25 bg-emerald-500/[0.05]">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            <p className="text-sm font-medium">لا توجد سجلات عالقة — مسار البيانات سليم.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {breaks.map((def) => (
            <Link key={def.key} to={def.href} className="group block h-full">
              <Card className="h-full border-destructive/25 bg-destructive/[0.04] transition-colors group-hover:border-destructive/50">
                <CardContent className="flex items-start gap-3 p-4">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{def.label}</h3>
                      <Badge variant="destructive" className="tabular-nums">{countOf(def.key)}</Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{def.hint}</p>
                  </div>
                  <ChevronLeft className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default ModuleAlerts;
