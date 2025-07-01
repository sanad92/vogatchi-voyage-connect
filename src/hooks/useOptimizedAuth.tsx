
import { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthContextType, Profile } from '@/types/auth';
import { useNavigate } from 'react-router-dom';
import { cleanupAuthState } from '@/utils/authCleanup';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const OptimizedAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // دالة جلب بيانات المستخدم
  const fetchUserData = async (userId: string) => {
    try {
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
      ]);

      if (profileResult.data) {
        setProfile(profileResult.data);
      }
      
      setUserRole(roleResult.data?.role || 'viewer');
      
    } catch (error) {
      console.error('خطأ في جلب بيانات المستخدم:', error);
      setUserRole('viewer');
    }
  };

  // التحقق من صحة الجلسة
  const isValidSession = (session: Session | null): boolean => {
    if (!session?.access_token || !session?.user?.id) {
      return false;
    }
    
    if (session.expires_at) {
      const expiryTime = new Date(session.expires_at * 1000);
      const now = new Date();
      return expiryTime.getTime() > now.getTime();
    }
    
    return true;
  };

  // إعداد مراقب المصادقة
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (isValidSession(session) && session) {
          setSession(session);
          setUser(session.user);
          
          // جلب بيانات المستخدم
          setTimeout(() => {
            if (mounted && session.user?.id) {
              fetchUserData(session.user.id);
            }
          }, 100);
        } else {
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // فحص الجلسة الحالية
    const checkCurrentSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (isValidSession(session) && session) {
          setSession(session);
          setUser(session.user);
          
          setTimeout(() => {
            if (mounted && session.user?.id) {
              fetchUserData(session.user.id);
            }
          }, 100);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('خطأ في فحص الجلسة:', error);
        setLoading(false);
      }
    };

    checkCurrentSession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      // تنظيف البيانات السابقة
      cleanupAuthState();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (error) {
        throw new Error(error.message.includes('Invalid login credentials') 
          ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
          : error.message);
      }
      
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/dashboard');
      return { error: null };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تسجيل الدخول';
      toast.error(errorMessage);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      // تنظيف البيانات
      cleanupAuthState();
      
      await supabase.auth.signOut();
      
      // تنظيف الحالة المحلية
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSession(null);
      
      toast.success('تم تسجيل الخروج بنجاح');
      
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
      
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      window.location.href = '/auth';
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: string): boolean => {
    if (!userRole) return false;
    if (userRole === 'super_admin') return true;
    
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
    return allowedRoles?.includes(role) || false;
  };

  const isLoggedIn = (): boolean => {
    return !!(user && user.id && isValidSession(session) && userRole);
  };

  const value = {
    user,
    profile,
    userRole,
    session,
    loading,
    isLoading: loading,
    signIn,
    signOut,
    hasRole,
    isSuperAdmin: () => userRole === 'super_admin',
    isLoggedIn,
    canDelete: () => ['super_admin', 'admin', 'manager'].includes(userRole || ''),
    canEditAll: () => ['super_admin', 'admin'].includes(userRole || ''),
    canManageSystemSettings: () => userRole === 'super_admin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useOptimizedAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useOptimizedAuth must be used within an OptimizedAuthProvider');
  }
  return context;
};
