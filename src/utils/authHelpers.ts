
export const cleanupAuthState = () => {
  // Remove standard auth tokens
  localStorage.removeItem('supabase.auth.token');
  
  // Remove all Supabase auth keys from localStorage
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Remove from sessionStorage if in use
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const hasRoleAccess = (userRole: string | null, requiredRole: string): boolean => {
  console.log('🔍 فحص الصلاحيات:', { userRole, requiredRole });
  
  if (!userRole) {
    console.log('❌ لا يوجد دور للمستخدم');
    return false;
  }
  
  const roleHierarchy = {
    'super_admin': ['super_admin', 'admin', 'manager', 'sales_agent', 'accountant', 'viewer'],
    'admin': ['admin', 'manager', 'sales_agent', 'accountant', 'viewer'],
    'manager': ['manager', 'sales_agent', 'accountant', 'viewer'],
    'sales_agent': ['sales_agent', 'viewer'],
    'accountant': ['accountant', 'viewer'],
    'viewer': ['viewer']
  };
  
  const allowedRoles = roleHierarchy[userRole as keyof typeof roleHierarchy];
  const hasAccess = allowedRoles?.includes(requiredRole) || false;
  
  console.log('✅ نتيجة فحص الصلاحيات:', { 
    userRole, 
    requiredRole, 
    allowedRoles, 
    hasAccess 
  });
  
  return hasAccess;
};
