import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, PauseCircle, PlayCircle } from 'lucide-react';
import { useMySopMemberships, useSetMyAvailability } from '@/hooks/useSop';
import { DEPARTMENT_LABELS, type SopDepartment } from '@/lib/sop';

interface Props {
  /** Department required to act on this screen (e.g. sales on intake). */
  department: SopDepartment;
}

/** Shows why the current user can (or can't) claim work on this screen. */
export const MySopStatusBar = ({ department }: Props) => {
  const { memberships, isManager, isLoading } = useMySopMemberships();
  const setAvailability = useSetMyAvailability();

  if (isLoading) return null;

  const mine = memberships.find((m) => m.department === department);
  const label = DEPARTMENT_LABELS[department];

  if (!mine) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
        <AlertCircle className="h-4 w-4 text-amber-600" />
        <span>
          حسابك غير مسجّل ضمن فريق {label}
          {memberships.length > 0 && (
            <span className="text-muted-foreground">
              {' '}— قسمك الحالي: {memberships.map((m) => DEPARTMENT_LABELS[m.department]).join('، ')}
            </span>
          )}
          {isManager ? ' (بصفتك مديرًا تقدر تستلم استثنائيًا)' : ' — اطلب من المدير إضافتك من صفحة فريق العمل'}
        </span>
        {isManager && (
          <Button asChild size="sm" variant="outline" className="h-7">
            <Link to="/team">فريق العمل</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
      {mine.is_available ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <PauseCircle className="h-4 w-4 text-amber-600" />
      )}
      <span>أنت في قسم {label}</span>
      <Badge variant={mine.is_available ? 'secondary' : 'outline'}>
        {mine.is_available ? 'متاح' : 'غير متاح'}
      </Badge>
      <Button
        size="sm"
        variant="ghost"
        className="h-7"
        disabled={setAvailability.isPending}
        onClick={() => setAvailability.mutate({ department, is_available: !mine.is_available })}
      >
        {mine.is_available ? (
          <><PauseCircle className="h-3.5 w-3.5 ml-1" /> إيقاف الاستلام مؤقتًا</>
        ) : (
          <><PlayCircle className="h-3.5 w-3.5 ml-1" /> تفعيل التوفر</>
        )}
      </Button>
    </div>
  );
};

export default MySopStatusBar;
