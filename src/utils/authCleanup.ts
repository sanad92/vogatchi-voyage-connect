export const cleanupAuthState = () => {
  try {
    Object.keys(localStorage).forEach((key) => {
      if (
        key.startsWith('supabase.auth.') ||
        key.includes('sb-') ||
        key.includes('supabase-') ||
        key.startsWith('current_org_') ||
        key.startsWith('org_setup_skipped_') ||
        key === 'org_setup_skipped'
      ) {
        localStorage.removeItem(key);
      }
    });

    if (typeof sessionStorage !== 'undefined') {
      Object.keys(sessionStorage).forEach((key) => {
        if (
          key.startsWith('supabase.auth.') ||
          key.includes('sb-') ||
          key.includes('supabase-')
        ) {
          sessionStorage.removeItem(key);
        }
      });
    }
  } catch (cleanupError) {
    console.error('خطأ في تنظيف بيانات المصادقة:', cleanupError);
  }
};

export const hasStoredAuthData = (): boolean => {
  try {
    return Object.keys(localStorage).some(
      (key) =>
        key.startsWith('supabase.auth.') || key.includes('sb-') || key.includes('supabase-')
    );
  } catch {
    return false;
  }
};
