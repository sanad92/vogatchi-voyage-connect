
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

  console.log('🔐 Auth State:', { user: !!user, profile: !!profile, userRole, loading });

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
      // لا نعيد تعيين القيم إلى null في حالة الخطأ
      // نبقي على القيم الافتراضية
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

  // إعداد مراقب المصادقة محسن
  useEffect(() => {
    let mounted = true;
    console.log('🚀 Setting up auth listener...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔄 Auth state changed:', event, !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user && event === 'SIGNED_IN') {
          // تأخير بسيط لتجنب المشاكل
          setTimeout(() => {
            if (mounted) {
              fetchUserData(session.user.id);
            }
          }, 100);
        } else if (!session) {
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // فحص الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      
      console.log('🔍 Initial session check:', !!session);
      
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
      console.log('🔐 Attempting sign in for:', email);
      
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
        toast.error(errorMessage);
        return { error };
      }
      
      console.log('✅ Sign in successful');
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/');
      return { error: null };
      
    } catch (error) {
      console.error('❌ خطأ في تسجيل الدخول:', error);
      toast.error('حدث خطأ في تسجيل الدخول');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('🚪 Signing out...');
      
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSession(null);
      
      toast.success('تم تسجيل الخروج بنجاح');
      navigate('/auth');
    } catch (error) {
      console.error('❌ خطأ في تسجيل الخروج:', error);
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

  // تبسيط منطق isLoggedIn لتجنب المشاكل
  const isLoggedIn = (): boolean => {
    const loggedIn = !!(user && session);
    console.log('🔍 Is logged in check:', loggedIn, { user: !!user, session: !!session });
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
