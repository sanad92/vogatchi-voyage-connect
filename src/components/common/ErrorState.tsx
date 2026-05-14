import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  description?: string;
  error?: unknown;
  onRetry?: () => void;
  className?: string;
}

const ErrorState = ({
  title = 'حدث خطأ غير متوقّع',
  description = 'يرجى المحاولة مرة أخرى أو إعادة تحميل الصفحة.',
  error,
  onRetry,
  className,
}: ErrorStateProps) => {
  const errorMessage =
    error instanceof Error ? error.message : typeof error === 'string' ? error : null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        'rounded-xl border border-destructive/30 bg-destructive/5',
        'px-6 py-12',
        className,
      )}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/15 text-destructive mb-4">
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground leading-relaxed">
        {description}
      </p>
      {errorMessage && (
        <code className="mt-3 max-w-md truncate rounded-md bg-muted px-3 py-1.5 text-xs text-muted-foreground">
          {errorMessage}
        </code>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-5" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5 ml-2" />
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
