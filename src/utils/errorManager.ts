import { toast } from 'sonner';

interface ErrorLogEntry {
  timestamp: Date;
  level: 'error' | 'warn' | 'info';
  component: string;
  message: string;
  details?: any;
  userId?: string;
}

class ErrorManager {
  private logs: ErrorLogEntry[] = [];
  private maxLogs = 100;

  private log(entry: ErrorLogEntry) {
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      const emoji = entry.level === 'error' ? '❌' : entry.level === 'warn' ? '⚠️' : 'ℹ️';
      console.group(`${emoji} ${entry.component}`);
      console.log('Message:', entry.message);
      if (entry.details) {
        console.log('Details:', entry.details);
      }
      console.log('Timestamp:', entry.timestamp);
      console.groupEnd();
    }
  }

  error(component: string, message: string, details?: any, showToast = true) {
    this.log({
      timestamp: new Date(),
      level: 'error',
      component,
      message,
      details
    });

    if (showToast) {
      toast.error(message);
    }
  }

  warn(component: string, message: string, details?: any) {
    this.log({
      timestamp: new Date(),
      level: 'warn',
      component,
      message,
      details
    });
  }

  info(component: string, message: string, details?: any) {
    this.log({
      timestamp: new Date(),
      level: 'info',
      component,
      message,
      details
    });
  }

  success(message: string) {
    toast.success(message);
  }

  getLogs(level?: 'error' | 'warn' | 'info') {
    return level ? this.logs.filter(log => log.level === level) : this.logs;
  }

  clearLogs() {
    this.logs = [];
  }

  async handleAsyncError<T>(
    component: string,
    operation: () => Promise<T>,
    fallback?: T,
    customErrorMessage?: string
  ): Promise<T | undefined> {
    try {
      return await operation();
    } catch (error) {
      const message = customErrorMessage || 'حدث خطأ غير متوقع';
      this.error(component, message, error);
      return fallback;
    }
  }
}

export const errorManager = new ErrorManager();

// Helper function for handling form errors
export const handleFormError = (component: string, error: any, fieldName?: string) => {
  const message = fieldName 
    ? `خطأ في حقل ${fieldName}: ${error.message || 'قيمة غير صحيحة'}`
    : `خطأ في النموذج: ${error.message || 'بيانات غير صحيحة'}`;
  
  errorManager.error(component, message, error, false);
  return message;
};

// Helper function for API errors
export const handleApiError = (component: string, error: any, operation?: string) => {
  const message = operation 
    ? `فشل في ${operation}: ${error.message || 'خطأ في الشبكة'}`
    : `خطأ في API: ${error.message || 'خطأ في الاتصال'}`;
  
  errorManager.error(component, message, error);
  return message;
};