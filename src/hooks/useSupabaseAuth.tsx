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

const ROLE_LEVELS: Record<string, number> = {
  owner: 5, admin: 4, manager: 3, agent: 2, viewer: 1,
};

const SupabaseAuthContext = createContext<SupabaseAuthContextType | undefined>(undefined);

/**
 * @deprecated Use OptimizedAuthProvider + OrganizationProvider instead.
 * This hook is kept for backward compatibility but will be removed.
 */
export const SupabaseAuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isValidSession = (session: Session | null): boolean => {
    if (!session?.access_token || !session?.user?.id) return false;
    if (session.expires_at) {
      return new Date(session.expires_at * 1000).getTime() > Date.now();
    }
    return true;
  };

  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, is_active, employee_id, department, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile({
          ...profileData,
          user_id: userId,
          position: '',
          hire_date: ''
        } as Profile);
      }

      // Get role from first active org membership
      const { data: memberData } = await supabase
        .from('organization_members')
        .select('role')
        .eq('user_id', userId)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      setUserRole(memberData?.role || 'viewer');
    } catch (error) {
      console.error('خطأ في جلب بيانات المستخدم:', error);
      setUserRole('viewer');
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (isValidSession(session) && session?.user) {
          setTimeout(() => {
            if (mounted && session.user?.id) fetchUserData(session.user.id);
          }, 100);
        } else {
          setProfile(null);
          setUserRole(null);
        }
        if (event === 'SIGNED_OUT') { setProfile(null); setUserRole(null); }
        setLoading(false);
      }
    );

    const checkCurrentSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isValidSession(session) && session) {
          setSession(session);
          setUser(session.user);
          setTimeout(() => {
            if (mounted && session.user?.id) fetchUserData(session.user.id);
          }, 100);
        }
        setLoading(false);
      } catch { setLoading(false); }
    };

    checkCurrentSession();
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(), password,
      });
      if (error) throw new Error(error.message.includes('Invalid login credentials') 
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة' : error.message);
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/dashboard');
      return { error: null };
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في تسجيل الدخول');
      return { error };
    } finally { setLoading(false); }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(), password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName || '' }
        }
      });
      if (error) throw new Error(error.message);
      if (data.user && !data.user.email_confirmed_at) {
        toast.success('تم إنشاء الحساب! يرجى فحص بريدك الإلكتروني');
      } else {
        toast.success('تم إنشاء الحساب بنجاح');
        navigate('/dashboard');
      }
      return { error: null };
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'فشل في إنشاء الحساب');
      return { error };
    } finally { setLoading(false); }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setUser(null); setProfile(null); setUserRole(null); setSession(null);
      toast.success('تم تسجيل الخروج بنجاح');
      navigate('/auth');
    } catch { navigate('/auth'); } finally { setLoading(false); }
  };

  const hasRole = (role: string): boolean => {
    if (!userRole) return false;
    const userLevel = ROLE_LEVELS[userRole] ?? 0;
    const requiredLevel = ROLE_LEVELS[role] ?? 0;
    return userLevel >= requiredLevel;
  };

  const value: SupabaseAuthContextType = {
    user, profile, userRole, session, loading,
    signIn, signUp, signOut, hasRole,
    isSuperAdmin: () => userRole === 'owner',
    isLoggedIn: () => !!user && !!profile && profile.is_active,
    canDelete: () => hasRole('manager'),
    canEditAll: () => hasRole('admin'),
    canManageSystemSettings: () => userRole === 'owner',
  };

  return <SupabaseAuthContext.Provider value={value}>{children}</SupabaseAuthContext.Provider>;
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (context === undefined) {
    throw new Error('useSupabaseAuth must be used within a SupabaseAuthProvider');
  }
  return context;
};
