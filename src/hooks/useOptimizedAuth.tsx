import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType, Profile } from '@/types/auth';
import { useNavigate } from 'react-router-dom';
import { cleanupAuthState } from '@/utils/authCleanup';
import { errorManager } from '@/utils/errorManager';
import { toast } from 'sonner';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ROLE_LEVELS: Record<string, number> = {
  owner: 5, admin: 4, manager: 3, agent: 2, viewer: 1,
};

export const OptimizedAuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const fetchingRef = useRef(false);

  const isValidSession = useCallback((s: Session | null): boolean => {
    if (!s?.access_token || !s?.user?.id) return false;
    if (s.expires_at) {
      return s.expires_at * 1000 > Date.now();
    }
    return true;
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (mountedRef.current && profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      errorManager.error('Auth', 'خطأ في جلب بيانات المستخدم', error, false);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  const clearState = useCallback(() => {
    setSession(null);
    setUser(null);
    setProfile(null);
    setUserRole(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let initialised = false;

    // 1. Set up listener FIRST (per Supabase docs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mountedRef.current) return;

        if (event === 'SIGNED_OUT') {
          clearState();
          setLoading(false);
          return;
        }

        if (isValidSession(currentSession) && currentSession) {
          setSession(currentSession);
          setUser(currentSession.user);
          // Defer data fetch to avoid Supabase deadlock in callback
          fetchUserData(currentSession.user.id);
        } else if (!currentSession) {
          clearState();
        }

        // Only stop loading from listener after initial session check
        if (initialised) {
          setLoading(false);
        }
      }
    );

    // 2. Then get current session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      if (!mountedRef.current) return;
      initialised = true;

      if (isValidSession(currentSession) && currentSession) {
        setSession(currentSession);
        setUser(currentSession.user);
        fetchUserData(currentSession.user.id);
      }
      setLoading(false);
    }).catch(() => {
      if (mountedRef.current) setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [isValidSession, fetchUserData, clearState]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      cleanupAuthState();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        throw new Error(
          error.message.includes('Invalid login credentials')
            ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
            : error.message
        );
      }

      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/dashboard');
      return { error: null };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'فشل في تسجيل الدخول';
      toast.error(msg);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName || '' },
        },
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
      const msg = error instanceof Error ? error.message : 'فشل في إنشاء الحساب';
      toast.error(msg);
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
      clearState();
      toast.success('تم تسجيل الخروج بنجاح');
      navigate('/auth');
    } catch {
      clearState();
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const setOrgRole = useCallback((role: string | null) => {
    setUserRole(role);
  }, []);

  const hasRole = useCallback((role: string): boolean => {
    if (!userRole) return false;
    return (ROLE_LEVELS[userRole] ?? 0) >= (ROLE_LEVELS[role] ?? 0);
  }, [userRole]);

  const isLoggedIn = useCallback((): boolean => {
    return !!(user?.id && isValidSession(session));
  }, [user, session, isValidSession]);

  const value: AuthContextType = {
    user,
    profile,
    userRole,
    session,
    loading,
    isLoading: loading,
    signIn,
    signUp,
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

/**
 * @deprecated Use useOptimizedAuth instead. This alias exists for backward compatibility.
 */
export const useSupabaseAuth = useOptimizedAuth;
