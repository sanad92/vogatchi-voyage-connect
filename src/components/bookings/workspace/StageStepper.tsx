import { Check, ChevronLeft } from 'lucide-react';
import { WORKFLOW_STAGES, type WorkflowStage } from '@/hooks/useBookingWorkspace';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const STAGE_LABELS: Record<WorkflowStage, string> = {
  lead: 'مهتم',
  qualified: 'مؤهل',
  quoted: 'تم التسعير',
  confirmed: 'مؤكد',
  paid: 'مدفوع',
  operations: 'تشغيل',
  traveling: 'مسافر',
  completed: 'مكتمل',
  post_travel: 'ما بعد السفر',
  cancelled: 'ملغي',
};

interface Props {
  stage: WorkflowStage | undefined | null;
  onChange: (next: WorkflowStage) => void | Promise<unknown>;
}

export const StageStepper = ({ stage, onChange }: Props) => {
  const current = (stage || 'lead') as WorkflowStage;
  const currentIdx = WORKFLOW_STAGES.indexOf(current);
  const isCancelled = current === 'cancelled';

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm font-medium">مرحلة الحجز</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className="h-7 text-xs">
              تغيير المرحلة <ChevronLeft className="h-3 w-3 mr-1" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1">
            <div className="grid gap-0.5">
              {[...WORKFLOW_STAGES, 'cancelled' as WorkflowStage].map((s) => (
                <Button
                  key={s}
                  variant={s === current ? 'secondary' : 'ghost'}
                  size="sm"
                  className="justify-start h-8"
                  onClick={() => onChange(s)}
                >
                  {STAGE_LABELS[s]}
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isCancelled ? (
        <div className="text-sm text-destructive font-medium">تم إلغاء هذا الحجز</div>
      ) : (
        <div className="overflow-x-auto">
          <ol className="flex items-center gap-1 min-w-max">
            {WORKFLOW_STAGES.map((s, i) => {
              const done = i < currentIdx;
              const active = i === currentIdx;
              return (
                <li key={s} className="flex items-center gap-1">
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs whitespace-nowrap border',
                      active && 'bg-primary text-primary-foreground border-primary shadow-sm',
                      done && 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
                      !active && !done && 'bg-muted/40 text-muted-foreground border-transparent',
                    )}
                  >
                    {done ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-current flex items-center justify-center text-[10px]">
                        {i + 1}
                      </span>
                    )}
                    <span>{STAGE_LABELS[s]}</span>
                  </div>
                  {i < WORKFLOW_STAGES.length - 1 && (
                    <span className="h-px w-4 bg-border" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
};
