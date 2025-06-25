
export interface ErrorLog {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  userId?: string;
  route?: string;
}

export interface AppError extends Error {
  code?: string;
  details?: any;
  timestamp?: Date;
  userId?: string;
  route?: string;
}

export const logError = (error: ErrorLog) => {
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error [${error.code}]`);
    console.error('Message:', error.message);
    console.error('Details:', error.details);
    console.error('Timestamp:', error.timestamp);
    console.error('User ID:', error.userId);
    console.error('Route:', error.route);
    console.groupEnd();
  }

  // In production, you could send to monitoring service
  // Example: Sentry, LogRocket, etc.
  
  return error;
};

export const handleError = (error: any, context?: string): AppError => {
  const appError: AppError = error instanceof Error ? error : new Error(String(error));
  
  if (context) {
    appError.code = context;
  }
  
  appError.timestamp = new Date();
  appError.route = typeof window !== 'undefined' ? window.location.pathname : undefined;
  
  logError({
    code: appError.code || 'UNKNOWN_ERROR',
    message: appError.message,
    details: appError,
    timestamp: appError.timestamp,
    route: appError.route
  });
  
  return appError;
};

export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxRetries) {
        throw handleError(error, `RETRY_FAILED_AFTER_${maxRetries}_ATTEMPTS`);
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError;
};

export const handleAsyncError = async (
  operation: () => Promise<any>,
  fallback?: any,
  errorCode?: string
) => {
  try {
    return await operation();
  } catch (error) {
    handleError(error, errorCode || 'ASYNC_OPERATION_ERROR');
    return fallback;
  }
};
