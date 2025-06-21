import { toast } from 'sonner';

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: any,
    public code: string = 'DATABASE_ERROR'
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class AuthenticationError extends Error {
  constructor(
    message: string = 'غير مصرح لك بالوصول',
    public code: string = 'AUTH_ERROR'
  ) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class PermissionError extends Error {
  constructor(
    message: string = 'ليس لديك صلاحية لهذا الإجراء',
    public code: string = 'PERMISSION_ERROR'
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

// معالج الأخطاء العام المحسن
export const handleError = (error: any, context?: string): AppError => {
  console.error(`Error in ${context || 'Unknown context'}:`, error);

  let appError: AppError;

  if (error instanceof ValidationError) {
    appError = {
      code: error.code,
      message: error.message,
      details: { field: error.field },
      timestamp: new Date()
    };
    toast.error(error.message);
  } else if (error instanceof DatabaseError) {
    appError = {
      code: error.code,
      message: 'حدث خطأ في قاعدة البيانات',
      details: error.originalError,
      timestamp: new Date()
    };
    toast.error('حدث خطأ في حفظ البيانات. يرجى المحاولة مرة أخرى.');
  } else if (error instanceof AuthenticationError) {
    appError = {
      code: error.code,
      message: error.message,
      timestamp: new Date()
    };
    toast.error(error.message);
  } else if (error instanceof PermissionError) {
    appError = {
      code: error.code,
      message: error.message,
      timestamp: new Date()
    };
    toast.error(error.message);
  } else if (error?.message?.includes('PGRST')) {
    // خطأ من Supabase
    appError = {
      code: 'SUPABASE_ERROR',
      message: 'حدث خطأ في الخادم',
      details: error,
      timestamp: new Date()
    };
    toast.error('حدث خطأ في الخادم. يرجى المحاولة مرة أخرى.');
  } else if (error?.message?.includes('Network')) {
    // خطأ شبكة
    appError = {
      code: 'NETWORK_ERROR',
      message: 'خطأ في الاتصال بالشبكة',
      details: error,
      timestamp: new Date()
    };
    toast.error('خطأ في الاتصال. يرجى التحقق من الإنترنت والمحاولة مرة أخرى.');
  } else {
    // خطأ عام
    appError = {
      code: 'UNKNOWN_ERROR',
      message: error?.message || 'حدث خطأ غير متوقع',
      details: error,
      timestamp: new Date()
    };
    toast.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
  }

  return appError;
};

// معالج أخطاء النماذج
export const handleFormError = (error: any, setErrors: (errors: Record<string, string>) => void) => {
  if (error instanceof ValidationError && error.field) {
    setErrors({ [error.field]: error.message });
  } else {
    const appError = handleError(error, 'Form submission');
    setErrors({ general: appError.message });
  }
};

// معالج أخطاء التحميل
export const handleLoadingError = (error: any, resourceName: string = 'البيانات') => {
  console.error(`Error loading ${resourceName}:`, error);
  toast.error(`فشل في تحميل ${resourceName}. يرجى إعادة تحميل الصفحة.`);
};

// معالج أخطاء الحفظ
export const handleSaveError = (error: any, resourceName: string = 'البيانات') => {
  console.error(`Error saving ${resourceName}:`, error);
  
  if (error?.message?.includes('duplicate') || error?.code === '23505') {
    toast.error(`${resourceName} موجود مسبقاً. يرجى استخدام قيم مختلفة.`);
  } else if (error?.message?.includes('foreign') || error?.code === '23503') {
    toast.error('هناك خطأ في ربط البيانات. يرجى التحقق من المعلومات المدخلة.');
  } else {
    toast.error(`فشل في حفظ ${resourceName}. يرجى المحاولة مرة أخرى.`);
  }
};

// معالج أخطاء الحذف
export const handleDeleteError = (error: any, resourceName: string = 'العنصر') => {
  console.error(`Error deleting ${resourceName}:`, error);
  
  if (error?.message?.includes('foreign') || error?.code === '23503') {
    toast.error(`لا يمكن حذف ${resourceName} لأنه مرتبط ببيانات أخرى.`);
  } else {
    toast.error(`فشل في حذف ${resourceName}. يرجى المحاولة مرة أخرى.`);
  }
};

// تسجيل الأخطاء للمراقبة
export const logError = (error: AppError, userId?: string) => {
  // يمكن إرسال الأخطاء إلى خدمة مراقبة خارجية هنا
  console.error('App Error:', {
    ...error,
    userId,
    userAgent: navigator.userAgent,
    url: window.location.href
  });
};

// إنشاء retry wrapper محسن للعمليات
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  backoff: boolean = true
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // لا تعيد المحاولة لأخطاء معينة
      if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
        break;
      }
      
      if (i < maxRetries - 1) {
        const waitTime = backoff ? delay * Math.pow(2, i) : delay;
        console.log(`Retry attempt ${i + 1}/${maxRetries} after ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
};

// دالة للتحقق من الاتصال بالشبكة
export const checkNetworkConnection = (): boolean => {
  return navigator.onLine;
};

// دالة لإضافة timeout للعمليات
export const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('انتهت مهلة العملية')), timeoutMs)
    )
  ]);
};
