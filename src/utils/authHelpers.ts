
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
  if (!userRole || !requiredRole) {
    return false;
  }

  const roleAliases: Record<string, string> = {
    super_admin: 'owner',
    sales_agent: 'agent',
    customer_service: 'agent',
    booking_agent: 'agent',
    accountant: 'manager',
  };

  const normalizeRole = (role: string): string => roleAliases[role] ?? role;

  const roleLevels: Record<string, number> = {
    owner: 5,
    admin: 4,
    manager: 3,
    agent: 2,
    viewer: 1,
  };

  const normalizedUserRole = normalizeRole(userRole);
  const normalizedRequiredRole = normalizeRole(requiredRole);

  if (!(normalizedUserRole in roleLevels) || !(normalizedRequiredRole in roleLevels)) {
    return false;
  }

  return roleLevels[normalizedUserRole] >= roleLevels[normalizedRequiredRole];
};

// دالة جديدة للتحقق من صلاحيات السوبر أدمن
export const isSuperAdmin = (userRole: string | null): boolean => {
  return userRole === 'super_admin' || userRole === 'owner';
};

// دالة للتحقق من صلاحيات الحذف
export const canDeleteData = (userRole: string | null): boolean => {
  return userRole === 'super_admin' || userRole === 'owner' || userRole === 'admin' || userRole === 'manager';
};

// دالة للتحقق من صلاحيات التعديل الكاملة
export const canEditAllData = (userRole: string | null): boolean => {
  return userRole === 'super_admin' || userRole === 'owner' || userRole === 'admin';
};

// دالة للتحقق من صلاحيات إدارة النظام
export const canManageSystem = (userRole: string | null): boolean => {
  return userRole === 'super_admin' || userRole === 'owner';
};
