import { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthContextType, Profile } from '@/types/auth';
import { useNavigate } from 'react-router-dom';
import { cleanupAuthState, hasStoredAuthData } from '@/utils/authCleanup';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const OptimizedAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [forceAuthCheck, setForceAuthCheck] = useState(false);
  const navigate = useNavigate();

  console.log('🔐 حالة المصادقة:', { 
    user: !!user, 
    profile: !!profile, 
    userRole, 
    loading,
    sessionExists: !!session,
    sessionValid: session && !session.expires_at ? false : session ? new Date(session.expires_at * 1000) > new Date() : false,
    hasStoredData: hasStoredAuthData(),
    forceAuthCheck
  });

  // دالة محسنة لجلب بيانات المستخدم
  const fetchUserData = async (userId: string) => {
    try {
      console.log('📋 جلب بيانات المستخدم للمعرف:', userId);
      
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

      console.log('📋 نتيجة الملف الشخصي:', profileResult);
      console.log('📋 نتيجة الدور:', roleResult);

      if (profileResult.error && profileResult.error.code !== 'PGRST116') {
        console.error('❌ خطأ جلب الملف الشخصي:', profileResult.error);
        throw profileResult.error;
      }

      if (roleResult.error && roleResult.error.code !== 'PGRST116') {
        console.error('❌ خطأ جلب الدور:', roleResult.error);
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

  // التحقق من صحة الجلسة مع فحوصات محسنة
  const isValidSession = (session: Session | null): boolean => {
    if (!session) {
      console.log('❌ لا توجد جلسة');
      return false;
    }
    
    // التحقق من وجود access_token
    if (!session.access_token) {
      console.log('❌ لا يوجد access_token');
      return false;
    }
    
    // التحقق من وجود user
    if (!session.user || !session.user.id) {
      console.log('❌ لا يوجد user صالح في الجلسة');
      return false;
    }
    
    // التحقق من انتهاء صلاحية الجلسة
    if (session.expires_at) {
      const expiryTime = new Date(session.expires_at * 1000);
      const now = new Date();
      const bufferTime = 5 * 60 * 1000; // 5 دقائق buffer
      
      if (expiryTime.getTime() - now.getTime() < bufferTime) {
        console.log('⏰ الجلسة ستنتهي قريباً أو انتهت:', expiryTime, 'الآن:', now);
        return false;
      }
    }
    
    console.log('✅ الجلسة صالحة');
    return true;
  };

  // دالة لإجبار إعادة تعيين الحالة محسنة
  const forceResetAuth = async () => {
    console.log('🔄 إجبار إعادة تعيين حالة المصادقة...');
    
    setLoading(true);
    
    // تنظيف البيانات المخزنة أولاً
    cleanupAuthState();
    
    // إعادة تعيين الحالة المحلية
    setUser(null);
    setProfile(null);
    setUserRole(null);
    setSession(null);
    setForceAuthCheck(true);
    
    try {
      // محاولة تسجيل خروج شامل
      await supabase.auth.signOut({ scope: 'global' });
      console.log('✅ تم تسجيل الخروج الشامل');
    } catch (error) {
      console.log('ℹ️ خطأ في تسجيل الخروج الشامل (متوقع):', error);
    }
    
    // تأخير قصير للسماح بالتنظيف
    setTimeout(() => {
      setLoading(false);
      console.log('✅ تم إعادة تعيين حالة المصادقة');
    }, 500);
  };

  // إعداد مراقب المصادقة محسن
  useEffect(() => {
    let mounted = true;
    console.log('🚀 إعداد مراقب المصادقة...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        console.log('🔄 تغيرت حالة المصادقة:', event, !!session);
        console.log('👤 معرف المستخدم:', session?.user?.id);
        console.log('📧 بريد المستخدم:', session?.user?.email);
        
        // التحقق من صحة الجلسة
        const validSession = isValidSession(session);
        console.log('✅ صحة الجلسة:', validSession);
        
        if (validSession && session) {
          setSession(session);
          setUser(session.user);
          
          // جلب بيانات المستخدم مع تأخير لتجنب deadlock
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            setTimeout(() => {
              if (mounted && session.user?.id) {
                fetchUserData(session.user.id);
              }
            }, 100);
          } else if (profile?.id === session.user.id) {
            // المستخدم نفسه، احتفظ بالبيانات الموجودة
            console.log('ℹ️ نفس المستخدم، الاحتفاظ بالبيانات الموجودة');
          } else {
            // مستخدم جديد، جلب البيانات
            setTimeout(() => {
              if (mounted) {
                fetchUserData(session.user.id);
              }
            }, 100);
          }
        } else {
          // جلسة غير صالحة أو منتهية الصلاحية
          console.log('🧹 جلسة غير صالحة، تنظيف...');
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole(null);
          
          // إذا كانت الجلسة منتهية، قم بتنظيف البيانات المخزنة
          if (event === 'SIGNED_OUT' || !session) {
            cleanupAuthState();
          }
        }
        
        setLoading(false);
      }
    );

    // فحص الجلسة الحالية مع التحقق من الصلاحية
    const checkCurrentSession = async () => {
      try {
        // إذا كان هناك إجبار للفحص، تخطي فحص الجلسة الحالية
        if (forceAuthCheck) {
          console.log('🔄 تم إجبار إعادة فحص المصادقة');
          setForceAuthCheck(false);
          setLoading(false);
          return;
        }
        
        console.log('🔍 فحص الجلسة الأولي...');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ خطأ فحص الجلسة:', error);
          cleanupAuthState();
          setLoading(false);
          return;
        }
        
        console.log('🔍 فحص الجلسة الأولي:', !!session);
        console.log('👤 معرف المستخدم الأولي:', session?.user?.id);
        console.log('📧 بريد المستخدم الأولي:', session?.user?.email);
        
        const validSession = isValidSession(session);
        console.log('✅ صحة الجلسة الأولية:', validSession);
        
        if (validSession && session) {
          setSession(session);
          setUser(session.user);
          
          // جلب بيانات المستخدم
          setTimeout(() => {
            if (mounted && session.user?.id) {
              fetchUserData(session.user.id);
            }
          }, 100);
        } else {
          console.log('🧹 لا توجد جلسة صالحة، تنظيف...');
          cleanupAuthState();
          setSession(null);
          setUser(null);
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('❌ فشل فحص الجلسة:', error);
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
  }, [forceAuthCheck]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('🔐 محاولة تسجيل الدخول لـ:', email);
      
      // تنظيف أي بيانات مصادقة سابقة
      cleanupAuthState();
      
      // محاولة تسجيل خروج عام
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.log('ℹ️ فشل تسجيل الخروج العام (متوقع):', err);
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (error) {
        console.error('❌ خطأ تسجيل الدخول:', error);
        let errorMessage = 'فشل في تسجيل الدخول';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        }
        throw new Error(errorMessage);
      }
      
      console.log('✅ نجح تسجيل الدخول');
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
      console.log('🚪 تسجيل الخروج...');
      
      // تنظيف البيانات أولاً
      cleanupAuthState();
      
      // محاولة تسجيل خروج شامل
      try {
        await supabase.auth.signOut({ scope: 'global' });
        console.log('✅ تم تسجيل الخروج الشامل');
      } catch (err) {
        console.log('ℹ️ خطأ تسجيل الخروج (تجاهل):', err);
      }
      
      // تنظيف الحالة المحلية
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSession(null);
      
      // التوجيه إلى صفحة المصادقة مع إعادة تحميل كاملة
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
      
    } catch (error) {
      console.error('❌ خطأ في تسجيل الخروج:', error);
      // في حالة الخطأ، أعد تحميل الصفحة للتأكد من التنظيف
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
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
    const hasValidUser = !!(user && user.id && user.email);
    const hasActiveProfile = !!(profile && profile.is_active !== false);
    const hasValidRole = !!userRole;
    
    const loggedIn = hasValidUser && validSession && hasValidRole;
    
    console.log('🔍 فحص تسجيل الدخول:', loggedIn, { 
      hasValidUser,
      validSession, 
      hasActiveProfile,
      hasValidRole,
      userEmail: user?.email,
      userId: user?.id,
      profileActive: profile?.is_active,
      userRole 
    });
    
    return loggedIn;
  };

  // تشخيص حالة المصادقة الحالية
  console.log('🧩 حالة المصادقة الحالية:', {
    loading,
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    hasProfile: !!profile,
    profileActive: profile?.is_active,
    hasRole: !!userRole,
    userRole,
    hasSession: !!session,
    sessionValid: isValidSession(session),
    isSuperAdmin: userRole === 'super_admin',
    forceAuthCheck
  });

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
    canManageSystemSettings: () => userRole === 'super_admin',
    forceResetAuth
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
