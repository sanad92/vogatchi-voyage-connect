
// دالة تنظيف شاملة وقوية لبيانات المصادقة
export const cleanupAuthState = () => {
  console.log('🧹 بدء عملية تنظيف شاملة لبيانات المصادقة...');
  
  try {
    // تنظيف localStorage
    const localStorageKeys = Object.keys(localStorage);
    localStorageKeys.forEach(key => {
      if (key.startsWith('supabase.auth.') || 
          key.includes('sb-') || 
          key.includes('supabase-') ||
          key.startsWith('sb.')) {
        localStorage.removeItem(key);
        console.log('🗑️ تم حذف من localStorage:', key);
      }
    });
    
    // تنظيف sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      const sessionStorageKeys = Object.keys(sessionStorage);
      sessionStorageKeys.forEach(key => {
        if (key.startsWith('supabase.auth.') || 
            key.includes('sb-') || 
            key.includes('supabase-') ||
            key.startsWith('sb.')) {
          sessionStorage.removeItem(key);
          console.log('🗑️ تم حذف من sessionStorage:', key);
        }
      });
    }
    
    // تنظيف cookies المتعلقة بـ Supabase
    if (typeof document !== 'undefined') {
      const cookies = document.cookie.split(';');
      cookies.forEach(cookie => {
        const eqPos = cookie.indexOf('=');
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
        if (name.includes('sb-') || 
            name.includes('supabase') || 
            name.startsWith('sb.')) {
          // حذف cookie بتعيين تاريخ انتهاء في الماضي
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
          console.log('🍪 تم حذف cookie:', name);
        }
      });
    }
    
    // تنظيف IndexedDB إذا وُجد
    if (typeof indexedDB !== 'undefined') {
      try {
        indexedDB.deleteDatabase('supabase-auth');
        console.log('🗄️ تم حذف IndexedDB للمصادقة');
      } catch (error) {
        console.log('ℹ️ IndexedDB للمصادقة غير موجود أو لا يمكن حذفه');
      }
    }
    
    console.log('✅ تم الانتهاء من تنظيف بيانات المصادقة');
  } catch (error) {
    console.error('❌ خطأ في تنظيف بيانات المصادقة:', error);
  }
};

// دالة للتحقق من وجود بيانات مصادقة مخزنة
export const hasStoredAuthData = (): boolean => {
  try {
    const localStorageKeys = Object.keys(localStorage);
    const hasLocalStorage = localStorageKeys.some(key => 
      key.startsWith('supabase.auth.') || 
      key.includes('sb-') || 
      key.includes('supabase-')
    );
    
    if (typeof sessionStorage !== 'undefined') {
      const sessionStorageKeys = Object.keys(sessionStorage);
      const hasSessionStorage = sessionStorageKeys.some(key => 
        key.startsWith('supabase.auth.') || 
        key.includes('sb-') || 
        key.includes('supabase-')
      );
      return hasLocalStorage || hasSessionStorage;
    }
    
    return hasLocalStorage;
  } catch (error) {
    console.error('خطأ في فحص بيانات المصادقة المخزنة:', error);
    return false;
  }
};

// دالة لتنظيف قوي وإعادة تحميل الصفحة
export const forceAuthReset = () => {
  console.log('🔄 إجبار إعادة تعيين المصادقة مع إعادة تحميل');
  cleanupAuthState();
  
  // تأخير قصير ثم إعادة تحميل الصفحة
  setTimeout(() => {
    window.location.href = '/auth';
  }, 500);
};
