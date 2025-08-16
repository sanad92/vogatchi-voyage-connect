import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { mockAuthService, MockUser, MockLoginCredentials } from '@/services/mockAuthService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface SimpleAuthContextType {
  user: MockUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (credentials: MockLoginCredentials) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isSuperAdmin: () => boolean;
  isLoggedIn: () => boolean;
  canDelete: () => boolean;
  canEditAll: () => boolean;
  canManageSystemSettings: () => boolean;
}

const SimpleAuthContext = createContext<SimpleAuthContextType | undefined>(undefined);

export const SimpleAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // فحص حالة المصادقة عند تحميل التطبيق
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await mockAuthService.checkAuthStatus();
        setUser(currentUser);
      } catch (error) {
        console.error('خطأ في فحص المصادقة:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signIn = async (credentials: MockLoginCredentials) => {
    try {
      setIsLoading(true);
      const response = await mockAuthService.login(credentials);
      setUser(response.user);
      toast.success(`مرحباً ${response.user.full_name}`);
      navigate('/dashboard');
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تسجيل الدخول';
      toast.error(errorMessage);
      return { error };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await mockAuthService.logout();
      setUser(null);
      toast.success('تم تسجيل الخروج بنجاح');
      navigate('/auth');
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      toast.error('حدث خطأ أثناء تسجيل الخروج');
    } finally {
      setIsLoading(false);
    }
  };

  // التحقق من الأدوار مع التسلسل الهرمي
  const hasRole = (role: string): boolean => {
    if (!user?.role) return false;
    if (user.role === 'super_admin') return true;
    
    const roleHierarchy = {
      'admin': ['admin', 'manager', 'sales_agent', 'customer_service', 'booking_agent', 'accountant', 'viewer'],
      'manager': ['manager', 'sales_agent', 'customer_service', 'booking_agent', 'accountant', 'viewer'],
      'sales_agent': ['sales_agent', 'viewer'],
      'customer_service': ['customer_service', 'viewer'],
      'booking_agent': ['booking_agent', 'viewer'],
      'accountant': ['accountant', 'viewer'],
      'viewer': ['viewer']
    };
    
    const allowedRoles = roleHierarchy[user.role as keyof typeof roleHierarchy];
    return allowedRoles?.includes(role) || false;
  };

  const value: SimpleAuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signOut,
    hasRole,
    isSuperAdmin: () => user?.role === 'super_admin',
    isLoggedIn: () => !!user && user.is_active,
    canDelete: () => ['super_admin', 'admin', 'manager'].includes(user?.role || ''),
    canEditAll: () => ['super_admin', 'admin'].includes(user?.role || ''),
    canManageSystemSettings: () => user?.role === 'super_admin'
  };

  return (
    <SimpleAuthContext.Provider value={value}>
      {children}
    </SimpleAuthContext.Provider>
  );
};

export const useSimpleAuth = () => {
  const context = useContext(SimpleAuthContext);
  if (context === undefined) {
    throw new Error('useSimpleAuth must be used within a SimpleAuthProvider');
  }
  return context;
};