import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, ArrowLeft, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { recommendNextAction, type WorkflowContext } from '@/lib/bookingWorkflow';
import type { Workspace } from './types';

interface Props {
  workspace: Workspace;
  ctx: WorkflowContext;
}

export const SmartNextActionCard = ({ workspace, ctx }: Props) => {
  const navigate = useNavigate();
  const rec = recommendNextAction(ctx);
  if (rec.key === 'none') return null;

  const advance = async () => {
    if (rec.advanceTo) {
      await workspace.setStage(rec.advanceTo);
      await workspace.logEvent({
        kind: 'stage_changed',
        summary: `تجاوز الخطوة: ${rec.title}`,
        payload: { via: 'smart_action', to: rec.advanceTo },
      });
    }
  };

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="pt-4 flex flex-wrap items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-[220px]">
          <p className="text-xs text-muted-foreground">الخطوة التالية المُوصى بها</p>
          <p className="font-semibold">{rec.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{rec.rationale}</p>
        </div>
        <div className="flex gap-2">
          {rec.advanceTo && (
            <Button size="sm" variant="ghost" onClick={advance} title="تم بالفعل / تخطي">
              <Check className="h-4 w-4 ml-1" /> تم
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => rec.ctaPath && navigate(rec.ctaPath)}
          >
            {rec.ctaLabel} <ArrowLeft className="h-4 w-4 mr-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
