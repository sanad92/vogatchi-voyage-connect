import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  label?: string;
  variant?: 'inline' | 'block' | 'full';
  className?: string;
}

const LoadingState = ({ label = 'جارٍ التحميل...', variant = 'block', className }: LoadingStateProps) => {
  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-2 text-sm text-muted-foreground', className)}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {label}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        variant === 'full' ? 'min-h-[60vh]' : 'py-12',
        className,
      )}
    >
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
};

/** Skeleton row block for table loading */
export const SkeletonRows = ({ count = 5, className }: { count?: number; className?: string }) => (
  <div className={cn('space-y-2', className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="h-12 rounded-md bg-muted/50 animate-pulse" />
    ))}
  </div>
);

export default LoadingState;
