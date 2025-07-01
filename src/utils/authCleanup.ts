
// دالة تنظيف بسيطة وفعالة لبيانات المصادقة
export const cleanupAuthState = () => {
  try {
    // تنظيف localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('supabase.auth.') || 
          key.includes('sb-') || 
          key.includes('supabase-')) {
        localStorage.removeItem(key);
      }
    });
    
    // تنظيف sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('supabase.auth.') || 
            key.includes('sb-') || 
            key.includes('supabase-')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch (error) {
    console.error('خطأ في تنظيف بيانات المصادقة:', error);
  }
};

// التحقق من وجود بيانات مصادقة مخزنة
export const hasStoredAuthData = (): boolean => {
  try {
    return Object.keys(localStorage).some(key => 
      key.startsWith('supabase.auth.') || 
      key.includes('sb-') || 
      key.includes('supabase-')
    );
  } catch (error) {
    return false;
  }
};
