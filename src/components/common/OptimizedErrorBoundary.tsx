import React from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { errorManager } from '@/utils/errorManager';

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

const ErrorFallback = ({ error, resetErrorBoundary }: ErrorFallbackProps) => {
  React.useEffect(() => {
    errorManager.error('ErrorBoundary', 'تم اكتشاف خطأ غير متوقع', error, false);
  }, [error]);

  return (
    <div className="min-h-[400px] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <CardTitle className="text-xl text-red-600">حدث خطأ غير متوقع</CardTitle>
          <CardDescription>
            نأسف، حدث خطأ أثناء تحميل هذا الجزء من الصفحة
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {process.env.NODE_ENV === 'development' && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 font-mono break-all">
                {error.message}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button onClick={resetErrorBoundary} className="flex-1">
              <RefreshCw className="h-4 w-4 mr-2" />
              إعادة المحاولة
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/dashboard'}
              className="flex-1"
            >
              <Home className="h-4 w-4 mr-2" />
              العودة للرئيسية
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface OptimizedErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

const OptimizedErrorBoundary = ({ 
  children, 
  fallback: Fallback = ErrorFallback,
  onError 
}: OptimizedErrorBoundaryProps) => {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    errorManager.error('ErrorBoundary', 'خطأ في React Component', { error, errorInfo });
    onError?.(error, errorInfo);
  };

  return (
    <ErrorBoundary
      FallbackComponent={Fallback}
      onError={handleError}
      onReset={() => {
        // تنظيف أي حالة أو cache عند إعادة التشغيل
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
};

export default OptimizedErrorBoundary;