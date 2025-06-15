
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
  console.log('🔍 فحص الصلاحيات التفصيلي:', { userRole, requiredRole });
  
  if (!userRole) {
    console.log('❌ لا يوجد دور للمستخدم');
    return false;
  }
  
  // السوبر أدمن له صلاحية كاملة على كل شيء
  if (userRole === 'super_admin') {
    console.log('✅ السوبر أدمن: صلاحية كاملة');
    return true;
  }
  
  const roleHierarchy = {
    'admin': ['admin', 'manager', 'sales_agent', 'customer_service', 'booking_agent', 'accountant', 'viewer'],
    'manager': ['manager', 'sales_agent', 'customer_service', 'booking_agent', 'accountant', 'viewer'],
    'sales_agent': ['sales_agent', 'viewer'],
    'customer_service': ['customer_service', 'viewer'],
    'booking_agent': ['booking_agent', 'viewer'],
    'accountant': ['accountant', 'viewer'],
    'viewer': ['viewer']
  };
  
  const allowedRoles = roleHierarchy[userRole as keyof typeof roleHierarchy];
  const hasAccess = allowedRoles?.includes(requiredRole) || false;
  
  console.log('✅ نتيجة فحص الصلاحيات التفصيلية:', { 
    userRole, 
    requiredRole, 
    allowedRoles, 
    hasAccess,
    hierarchyExists: !!allowedRoles,
    includesRole: allowedRoles?.includes(requiredRole)
  });
  
  return hasAccess;
};

// دالة جديدة للتحقق من صلاحيات السوبر أدمن
export const isSuperAdmin = (userRole: string | null): boolean => {
  return userRole === 'super_admin';
};

// دالة للتحقق من صلاحيات الحذف
export const canDeleteData = (userRole: string | null): boolean => {
  return userRole === 'super_admin' || userRole === 'admin' || userRole === 'manager';
};

// دالة للتحقق من صلاحيات التعديل الكاملة
export const canEditAllData = (userRole: string | null): boolean => {
  return userRole === 'super_admin' || userRole === 'admin';
};

// دالة للتحقق من صلاحيات إدارة النظام
export const canManageSystem = (userRole: string | null): boolean => {
  return userRole === 'super_admin';
};
