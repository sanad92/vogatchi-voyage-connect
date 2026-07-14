import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import type { WhatsAppWindowState } from '@/hooks/useWhatsAppWindow';

interface Props {
  state: WhatsAppWindowState;
}

export const WindowStatusBadge: React.FC<Props> = ({ state }) => {
  const { isWindowOpen, hoursRemaining, minutesRemaining, lastInboundAt, isLoading } = state;

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <Clock className="w-3 h-3" /> جاري التحقق...
      </Badge>
    );
  }

  const remainingLabel = (() => {
    if (!isWindowOpen) return null;
    const mins = minutesRemaining % 60;
    return `${hoursRemaining}س ${mins}د`;
  })();

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex">
            {isWindowOpen ? (
              <Badge
                variant="outline"
                className="gap-1.5 text-[11px] bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900"
              >
                <CheckCircle2 className="w-3 h-3" />
                نافذة الرد مفتوحة · متبقي {remainingLabel}
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1.5 text-[11px] bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900"
              >
                <AlertTriangle className="w-3 h-3" />
                نافذة الرد مغلقة · مطلوب قالب معتمد
              </Badge>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {isWindowOpen ? (
            <>
              يمكنك إرسال رسائل حرة حتى نهاية نافذة 24 ساعة التي تبدأ من آخر رسالة استلمتها من العميل.
              {lastInboundAt && (
                <div className="mt-1 opacity-80">آخر رد من العميل: {lastInboundAt.toLocaleString('ar-EG')}</div>
              )}
            </>
          ) : (
            <>
              وفقاً لسياسة Meta، لا يمكن إرسال رسائل حرة إلا إذا راسلك العميل خلال آخر 24 ساعة. استخدم قالباً معتمداً بدلاً من ذلك (خطأ Meta 131047).
            </>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
