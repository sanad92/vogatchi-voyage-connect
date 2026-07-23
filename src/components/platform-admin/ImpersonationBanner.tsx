import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImpersonationSession } from '@/hooks/useImpersonationSession';

const ImpersonationBanner = () => {
  const { active, stop } = useImpersonationSession();
  if (!active) return null;
  return (
    <div className="sticky top-0 z-[60] bg-amber-500 text-white shadow-md" dir="rtl">
      <div className="max-w-full px-4 py-2 flex items-center gap-3 text-sm">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <div className="flex-1 truncate">
          <span className="font-semibold">وضع الانتحال نشط</span>
          <span className="mx-2 opacity-80">— السبب: {active.reason}</span>
          <span className="opacity-70 text-xs">بدأت {new Date(active.started_at).toLocaleString('ar-EG')}</span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="bg-white/20 hover:bg-white/30 text-white border-white/30"
          onClick={() => stop.mutate()}
          disabled={stop.isPending}
        >
          <X className="h-3 w-3 ml-1" /> إنهاء الجلسة
        </Button>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
