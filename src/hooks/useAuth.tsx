
import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

interface Profile {
  id: string;
  email: string;
  full_name: string;
  department: string | null;
  phone: string | null;
  is_active: boolean;
}

interface UserRole {
  role: 'admin' | 'manager' | 'sales_agent' | 'accountant' | 'viewer' | 'super_admin';
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  userRole: string | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasRole: (role: string) => boolean;
  isSuperAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        console.error('No role found for user:', roleError);
        // المستخدم ليس له دور - ربما حساب جديد في انتظار التفعيل
        setProfile(profileData);
        setUserRole(null);
        return;
      }

      setProfile(profileData);
      setUserRole(roleData.role);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  useEffect(() => {
    // إعداد مستمع لتغيير حالة المصادقة
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // تأخير جلب البيانات لتجنب deadlock
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // التحقق من الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        toast({
          title: "خطأ في تسجيل الدخول",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: "مرحباً بك في نظام Vogatchi CRM",
        });
        // تحديث الصفحة للحصول على حالة نظيفة
        window.location.href = '/';
      }
      
      return { error };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut({ scope: 'global' });
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSession(null);
      
      toast({
        title: "تم تسجيل الخروج",
        description: "نراك قريباً",
      });
      
      // إعادة التوجيه لصفحة تسجيل الدخول
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: string): boolean => {
    if (!userRole) return false;
    
    const roleHierarchy = {
      'super_admin': ['super_admin', 'admin', 'manager', 'sales_agent', 'accountant', 'viewer'],
      'admin': ['admin', 'manager', 'sales_agent', 'accountant', 'viewer'],
      'manager': ['manager', 'sales_agent', 'accountant', 'viewer'],
      'sales_agent': ['sales_agent', 'viewer'],
      'accountant': ['accountant', 'viewer'],
      'viewer': ['viewer']
    };
    
    return roleHierarchy[userRole as keyof typeof roleHierarchy]?.includes(role) || false;
  };

  const isSuperAdmin = (): boolean => {
    return userRole === 'super_admin';
  };

  const value = {
    user,
    profile,
    userRole,
    session,
    loading,
    signIn,
    signOut,
    hasRole,
    isSuperAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
