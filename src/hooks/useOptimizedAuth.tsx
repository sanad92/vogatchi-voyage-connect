
import { createContext, useContext, useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthContextType, Profile } from '@/types/auth';
import { useNavigate } from 'react-router-dom';
import { cleanupAuthState } from '@/utils/authCleanup';
import { errorManager } from '@/utils/errorManager';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Role hierarchy: owner > admin > manager > agent > viewer
const ROLE_LEVELS: Record<string, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  agent: 2,
  viewer: 1,
};

export const OptimizedAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch profile only; role comes from OrganizationContext
  const fetchUserData = async (userId: string) => {
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      errorManager.error('Auth', 'خطأ في جلب بيانات المستخدم', error, false);
    }
  };

  const isValidSession = (session: Session | null): boolean => {
    if (!session?.access_token || !session?.user?.id) return false;
    if (session.expires_at) {
      return new Date(session.expires_at * 1000).getTime() > Date.now();
    }
    return true;
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        
        if (isValidSession(session) && session) {
          setSession(session);
          setUser(session.user);
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
        errorManager.error('Auth', 'خطأ في فحص الجلسة', error, false);
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
      
      errorManager.success('تم تسجيل الدخول بنجاح');
      navigate('/dashboard');
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'فشل في تسجيل الدخول';
      errorManager.error('Auth', errorMessage, error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      cleanupAuthState();
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSession(null);
      errorManager.success('تم تسجيل الخروج بنجاح');
      setTimeout(() => { window.location.href = '/auth'; }, 500);
    } catch (error) {
      errorManager.error('Auth', 'خطأ في تسجيل الخروج', error, false);
      window.location.href = '/auth';
    } finally {
      setLoading(false);
    }
  };

  /**
   * setOrgRole: called by OrganizationProvider to sync the current org role.
   * This keeps userRole in sync with the selected organization.
   */
  const setOrgRole = (role: string | null) => {
    setUserRole(role);
  };

  /**
   * Role hierarchy check: owner > admin > manager > agent > viewer
   * Returns true if the user's role is >= the required role.
   */
  const hasRole = (role: string): boolean => {
    if (!userRole) return false;
    const userLevel = ROLE_LEVELS[userRole] ?? 0;
    const requiredLevel = ROLE_LEVELS[role] ?? 0;
    return userLevel >= requiredLevel;
  };

  const isLoggedIn = (): boolean => {
    return !!(user && user.id && isValidSession(session));
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
    setOrgRole,
    isSuperAdmin: () => userRole === 'owner',
    isLoggedIn,
    canDelete: () => hasRole('manager'),
    canEditAll: () => hasRole('admin'),
    canManageSystemSettings: () => userRole === 'owner',
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
