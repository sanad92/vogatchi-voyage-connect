
import { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthContextType, Profile } from '@/types/auth';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// دالة تنظيف شاملة لبيانات المصادقة
const cleanupAuthState = () => {
  console.log('🧹 Cleaning up auth state...');
  
  // إزالة جميع مفاتيح Supabase من localStorage
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
      console.log('🗑️ Removed:', key);
    }
  });
  
  // إزالة من sessionStorage أيضاً
  Object.keys(sessionStorage || {}).forEach(key => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const OptimizedAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  console.log('🔐 Auth State:', { 
    user: !!user, 
    profile: !!profile, 
    userRole, 
    loading,
    sessionExists: !!session,
    sessionValid: session && !session.expires_at ? false : session ? new Date(session.expires_at * 1000) > new Date() : false
  });

  // دالة محسنة لجلب بيانات المستخدم
  const fetchUserData = async (userId: string) => {
    try {
      console.log('📋 Fetching user data for ID:', userId);
      
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

      console.log('📋 Profile result:', profileResult);
      console.log('📋 Role result:', roleResult);

      if (profileResult.error && profileResult.error.code !== 'PGRST116') {
        console.error('❌ Profile fetch error:', profileResult.error);
        throw profileResult.error;
      }

      if (roleResult.error && roleResult.error.code !== 'PGRST116') {
        console.error('❌ Role fetch error:', roleResult.error);
        throw roleResult.error;
      }

      setProfile(profileResult.data);
      setUserRole(roleResult.data?.role || 'viewer');
      
    } catch (error) {
      console.error('❌ خطأ في جلب بيانات المستخدم:', error);
      if (!profile) {
        setProfile({ 
          id: userId, 
          email: user?.email || '', 
          full_name: user?.email?.split('@')[0] || 'مستخدم',
          department: null,
          phone: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }
      if (!userRole) {
        setUserRole('viewer');
      }
    }
  };

  // التحقق من صحة الجلسة
  const isValidSession = (session: Session | null): boolean => {
    if (!session) return false;
    
    // التحقق من انتهاء صلاحية الجلسة
    if (session.expires_at) {
      const expiryTime = new Date(session.expires_at * 1000);
      const now = new Date();
      if (expiryTime <= now) {
        console.log('⏰ Session expired:', expiryTime, 'vs now:', now);
        return false;
      }
    }
    
    return !!(session.access_token && session.user);
  };

  // إعداد مراقب المصادقة محسن
  useEffect(() => {
    let mounted = true;
    console.log('🚀 Setting up auth listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔄 Auth state changed:', event, !!session);
        
        // التحقق من صحة الجلسة
        const validSession = isValidSession(session);
        console.log('✅ Session valid:', validSession);
        
        if (validSession && session) {
          setSession(session);
          setUser(session.user);
          
          if (event === 'SIGNED_IN') {
            setTimeout(() => {
              if (mounted) {
                fetchUserData(session.user.id);
              }
            }, 100);
          }
        } else {
          // جلسة غير صالحة أو منتهية الصلاحية
          console.log('🧹 Invalid session, cleaning up...');
          cleanupAuthState();
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // فحص الجلسة الحالية مع التحقق من الصلاحية
    const checkCurrentSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Session check error:', error);
          cleanupAuthState();
          setLoading(false);
          return;
        }
        
        console.log('🔍 Initial session check:', !!session);
        
        const validSession = isValidSession(session);
        console.log('✅ Initial session valid:', validSession);
        
        if (validSession && session) {
          setSession(session);
          setUser(session.user);
          fetchUserData(session.user.id);
        } else {
          console.log('🧹 No valid session found, cleaning up...');
          cleanupAuthState();
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('❌ Session check failed:', error);
        cleanupAuthState();
        setSession(null);
        setUser(null);
        setProfile(null);
        setUserRole(null);
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
      console.log('🔐 Attempting sign in for:', email);
      
      // تنظيف أي بيانات مصادقة سابقة
      cleanupAuthState();
      
      // محاولة تسجيل خروج عام
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('ℹ️ Global signout failed (expected):', err);
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (error) {
        console.error('❌ Sign in error:', error);
        let errorMessage = 'فشل في تسجيل الدخول';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        }
        throw new Error(errorMessage);
      }
      
      console.log('✅ Sign in successful');
      // التوجيه إلى /dashboard بدلاً من /
      navigate('/dashboard');
      return { error: null };
      
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('🚪 Signing out...');
      
      // تنظيف البيانات أولاً
      cleanupAuthState();
      
      // محاولة تسجيل خروج عام
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('ℹ️ Signout error (ignoring):', err);
      }
      
      // تنظيف الحالة المحلية
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSession(null);
      
      // التوجيه إلى صفحة المصادقة مع إعادة تحميل كاملة
      window.location.href = '/auth';
      
    } catch (error) {
      console.error('❌ خطأ في تسجيل الخروج:', error);
      // في حالة الخطأ، أعد تحميل الصفحة للتأكد من التنظيف
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

  // منطق محسن للتحقق من تسجيل الدخول
  const isLoggedIn = (): boolean => {
    const validSession = isValidSession(session);
    const loggedIn = !!(user && validSession);
    console.log('🔍 Is logged in check:', loggedIn, { 
      user: !!user, 
      session: !!session, 
      validSession,
      profile: !!profile,
      userRole 
    });
    return loggedIn;
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
