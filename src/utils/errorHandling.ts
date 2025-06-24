
export interface ErrorLog {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
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

export const handleAsyncError = async (
  operation: () => Promise<any>,
  fallback?: any,
  errorCode?: string
) => {
  try {
    return await operation();
  } catch (error) {
    logError({
      code: errorCode || 'ASYNC_OPERATION_ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error,
      timestamp: new Date(),
      route: window.location.pathname
    });
    
    return fallback;
  }
};
