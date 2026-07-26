import { Badge } from '@/components/ui/badge';
import { STAGE_LABELS } from '@/lib/bookingWorkflow';

interface Props {
  stage?: string | null;
  progressPct?: number | null;
}

export const WorkflowBadge = ({ stage, progressPct }: Props) => {
  if (!stage) return null;
  const label = STAGE_LABELS[stage as keyof typeof STAGE_LABELS] ?? stage;
  return (
    <Badge variant="secondary" className="gap-1">
      {label}
      {typeof progressPct === 'number' ? (
        <span className="text-[10px] opacity-70">· {progressPct}%</span>
      ) : null}
    </Badge>
  );
};
