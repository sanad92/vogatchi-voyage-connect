
import { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthContextType, Profile } from '@/types/auth';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const OptimizedAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // دالة محسنة لجلب بيانات المستخدم
  const fetchUserData = async (userId: string) => {
    try {
      // استعلام واحد محسن لجلب Profile و Role
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

      if (profileResult.error && profileResult.error.code !== 'PGRST116') {
        throw profileResult.error;
      }

      if (roleResult.error && roleResult.error.code !== 'PGRST116') {
        throw roleResult.error;
      }

      setProfile(profileResult.data);
      setUserRole(roleResult.data?.role || null);
    } catch (error) {
      console.error('خطأ في جلب بيانات المستخدم:', error);
      setProfile(null);
      setUserRole(null);
    }
  };

  // إعداد مراقب المصادقة محسن
  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && event === 'SIGNED_IN') {
          // تأخير بسيط لتجنب المشاكل
          setTimeout(() => {
            if (mounted) {
              fetchUserData(session.user.id);
            }
          }, 100);
        } else {
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // فحص الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (error) {
        let errorMessage = 'فشل في تسجيل الدخول';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        }
        toast.error(errorMessage);
        return { error };
      }
      
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/');
      return { error: null };
      
    } catch (error) {
      console.error('خطأ في تسجيل الدخول:', error);
      toast.error('حدث خطأ في تسجيل الدخول');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSession(null);
      toast.success('تم تسجيل الخروج بنجاح');
      navigate('/auth');
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      toast.error('حدث خطأ في تسجيل الخروج');
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
    return !!(user && session && profile?.is_active);
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
