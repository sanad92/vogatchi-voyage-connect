import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface PageSkeletonProps {
  variant?: 'list' | 'grid' | 'detail' | 'dashboard';
  className?: string;
}

/**
 * Reusable page-level skeleton patterns — matches the visual weight
 * of the real screen so the layout doesn't jump when data loads.
 */
export const PageSkeleton: React.FC<PageSkeletonProps> = ({ variant = 'list', className }) => {
  const wrapper = cn('p-4 lg:p-8 max-w-[1600px] mx-auto space-y-6', className);

  if (variant === 'dashboard') {
    return (
      <div className={wrapper}>
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Skeleton className="h-[340px] rounded-2xl xl:col-span-2" />
          <Skeleton className="h-[340px] rounded-2xl" />
        </div>
        <Skeleton className="h-[280px] rounded-2xl" />
      </div>
    );
  }

  if (variant === 'grid') {
    return (
      <div className={wrapper}>
        <Skeleton className="h-9 w-52 rounded-lg" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'detail') {
    return (
      <div className={wrapper}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-56 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-[420px] rounded-2xl lg:col-span-2" />
          <Skeleton className="h-[420px] rounded-2xl" />
        </div>
      </div>
    );
  }

  // list
  return (
    <div className={wrapper}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
      <div className="rounded-2xl border border-border overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-b-0">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3 rounded" />
              <Skeleton className="h-3 w-1/2 rounded" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PageSkeleton;
