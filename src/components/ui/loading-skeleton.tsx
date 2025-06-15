
import { cn } from "@/lib/utils"

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'card' | 'text' | 'avatar' | 'button' | 'stat';
  count?: number;
}

const LoadingSkeleton = ({ className, variant = 'card', count = 1 }: LoadingSkeletonProps) => {
  const getSkeletonContent = () => {
    switch (variant) {
      case 'card':
        return (
          <div className="border rounded-lg p-6 space-y-4 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full h-12 w-12" />
              <div className="space-y-2 flex-1">
                <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 rounded w-3/4" />
                <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-3 rounded w-1/2" />
              </div>
            </div>
            <div className="space-y-2">
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-3 rounded w-full" />
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-3 rounded w-5/6" />
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-3 rounded w-4/6" />
            </div>
            <div className="flex space-x-2 rtl:space-x-reverse">
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 rounded w-20" />
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 rounded w-24" />
            </div>
          </div>
        );
      
      case 'text':
        return (
          <div className="space-y-2">
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 rounded w-full" />
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 rounded w-5/6" />
            <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 rounded w-4/6" />
          </div>
        );
      
      case 'avatar':
        return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full h-12 w-12" />;
      
      case 'button':
        return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-10 rounded w-24" />;
      
      case 'stat':
        return (
          <div className="border rounded-lg p-6 space-y-4 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-3 rounded w-20" />
                <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-8 rounded w-16" />
              </div>
              <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-full h-12 w-12" />
            </div>
          </div>
        );
      
      default:
        return <div className="animate-pulse bg-gray-200 dark:bg-gray-700 h-4 rounded w-full" />;
    }
  };

  if (count === 1) {
    return (
      <div className={cn("", className)}>
        {getSkeletonContent()}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {getSkeletonContent()}
        </div>
      ))}
    </div>
  );
};

export { LoadingSkeleton };
