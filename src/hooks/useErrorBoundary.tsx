
import { useState, useCallback } from 'react';
import { handleError, AppError } from '@/utils/errorHandling';

export const useErrorBoundary = () => {
  const [error, setError] = useState<AppError | null>(null);

  const captureError = useCallback((error: any, context?: string) => {
    const appError = handleError(error, context);
    setError(appError);
    return appError;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const throwError = useCallback((error: any) => {
    throw error;
  }, []);

  return {
    error,
    captureError,
    clearError,
    throwError
  };
};
