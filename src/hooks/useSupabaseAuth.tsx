import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  is_active: boolean;
  employee_id?: string;
  department?: string;
  position?: string;
  hire_date?: string;
  created_at: string;
  updated_at: string;
}

interface SupabaseAuthContextType {
  user: User | null;
  profile: Profile | null;
  userRole: string | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error?: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isSuperAdmin: () => boolean;
  isLoggedIn: () => boolean;
  canDelete: () => boolean;
  canEditAll: () => boolean;
  canManageSystemSettings: () => boolean;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

export const SupabaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // فحص صحة الجلسة
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

  // جلب بيانات المستخدم
  const fetchUserData = async (userId: string) => {
    try {
      // استخدام id بدلاً من user_id مؤقتاً
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, is_active, employee_id, department, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('خطأ في جلب البروفايل:', profileError);
        return;
      }

      if (profileData) {
        // إضافة user_id للتوافق مع Interface
        const profileWithUserId = {
          ...profileData,
          user_id: userId,
          position: '',
          hire_date: ''
        };
        setProfile(profileWithUserId as Profile);
      }

      // جلب الدور
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('خطأ في جلب الدور:', roleError);
        setUserRole('viewer');
        return;
      }

      setUserRole(roleData?.role || 'viewer');
      
    } catch (error) {
      console.error('خطأ في جلب بيانات المستخدم:', error);
      setUserRole('viewer');
    }
  };

  // إعداد مراقب المصادقة
  useEffect(() => {
    let mounted = true;

    // مراقب تغيرات المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (isValidSession(session) && session?.user) {
          // تأجيل جلب البيانات لتجنب المشاكل
          setTimeout(() => {
            if (mounted && session.user?.id) {
              fetchUserData(session.user.id);
            }
          }, 100);
        } else {
          setProfile(null);
          setUserRole(null);
        }
        
        if (event === 'SIGNED_OUT') {
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
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      
      if (error) {
        let errorMessage = 'فشل في تسجيل الدخول';
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'يرجى تأكيد بريدك الإلكتروني أولاً';
        }
        throw new Error(errorMessage);
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

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName || '',
          }
        }
      });
      
      if (error) {
        let errorMessage = 'فشل في إنشاء الحساب';
        if (error.message.includes('User already registered')) {
          errorMessage = 'هذا البريد الإلكتروني مسجل مسبقاً';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
        }
        throw new Error(errorMessage);
      }
      
      if (data.user && !data.user.email_confirmed_at) {
        toast.success('تم إنشاء الحساب! يرجى فحص بريدك الإلكتروني لتأكيد الحساب');
      } else {
        toast.success('تم إنشاء الحساب بنجاح');
        navigate('/dashboard');
      }
      
      return { error: null };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في إنشاء الحساب';
      toast.error(errorMessage);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      
      await supabase.auth.signOut();
      
      // تنظيف الحالة المحلية
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSession(null);
      
      toast.success('تم تسجيل الخروج بنجاح');
      navigate('/');
      
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      toast.error('حدث خطأ أثناء تسجيل الخروج');
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  // التحقق من الأدوار مع التسلسل الهرمي
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

  const value: SupabaseAuthContextType = {
    user,
    profile,
    userRole,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    hasRole,
    isSuperAdmin: () => userRole === 'super_admin',
    isLoggedIn: () => !!user && !!profile && profile.is_active,
    canDelete: () => ['super_admin', 'admin', 'manager'].includes(userRole || ''),
    canEditAll: () => ['super_admin', 'admin'].includes(userRole || ''),
    canManageSystemSettings: () => userRole === 'super_admin'
  };

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};