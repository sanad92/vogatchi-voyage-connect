
import React, { Suspense } from 'react';
import EnhancedErrorBoundary from './EnhancedErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';

interface SafeComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingFallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  onError?: (error: Error) => void;
  resetKeys?: Array<string | number>;
}

const DefaultLoadingFallback = () => (
  <div className="space-y-3">
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-4 w-1/2" />
    <Skeleton className="h-8 w-1/4" />
  </div>
);

const DefaultErrorFallback = () => (
  <Alert className="border-red-200 bg-red-50">
    <AlertTriangle className="h-4 w-4 text-red-600" />
    <AlertDescription className="text-red-800">
      حدث خطأ في تحميل هذا المكون. يرجى إعادة تحميل الصفحة.
    </AlertDescription>
  </Alert>
);

export const SafeComponent: React.FC<SafeComponentProps> = ({
  children,
  fallback,
  loadingFallback = <DefaultLoadingFallback />,
  errorFallback = <DefaultErrorFallback />,
  onError,
  resetKeys
}) => {
  return (
    <EnhancedErrorBoundary
      fallback={errorFallback}
      onError={(error) => {
        console.error('SafeComponent Error:', error);
        onError?.(error);
      }}
      resetKeys={resetKeys}
    >
      <Suspense fallback={loadingFallback}>
        {children}
      </Suspense>
    </EnhancedErrorBoundary>
  );
};

export default SafeComponent;
