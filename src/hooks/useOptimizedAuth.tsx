import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AuthContextType, Profile } from '@/types/auth';
import { useNavigate } from 'react-router-dom';
import { cleanupAuthState } from '@/utils/authCleanup';
import { errorManager } from '@/utils/errorManager';
import { toast } from 'sonner';
import { getSafeInternalRedirect } from '@/lib/safeRedirect';
import { getAuthErrorMessage } from '@/lib/authErrorMessage';
import {
  browserSessionTimeRemaining,
  closeBrowserSessionActivity,
  getBrowserSessionActivityKey,
  startBrowserSessionActivity,
  watchBrowserSessionActivity,
} from '@/lib/browserSessionActivity';

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
  const lastFetchedUserIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentSessionRef = useRef<Session | null>(null);
  const signingOutRef = useRef(false);

  const isValidSession = useCallback((s: Session | null): boolean => {
    if (!s?.access_token || !s?.user?.id) return false;
    if (s.expires_at) {
      return s.expires_at * 1000 > Date.now();
    }
    return true;
  }, []);

  const fetchUserData = useCallback(async (userId: string) => {
    // Skip if already fetching for same user
    if (fetchingRef.current && lastFetchedUserIdRef.current === userId) return;
    
    // Abort previous request if different user
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    fetchingRef.current = true;
    lastFetchedUserIdRef.current = userId;
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle();

      // Check if this request was aborted or component unmounted
      if (controller.signal.aborted || !mountedRef.current) return;

      if (!error && profileData) {
        setProfile(profileData);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      errorManager.error('Auth', 'خطأ في جلب بيانات المستخدم', error, false);
    } finally {
      if (!controller.signal.aborted) {
        fetchingRef.current = false;
      }
    }
  }, []);

  const clearState = useCallback(() => {
    // Abort any pending fetch
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    lastFetchedUserIdRef.current = null;
    fetchingRef.current = false;
    currentSessionRef.current = null;
    setSession(null);
    setUser(null);
    setProfile(null);
    setUserRole(null);
  }, []);

  const endSession = useCallback(async (reason: 'manual' | 'idle' | 'invalid', expectedKey?: string) => {
    if (signingOutRef.current) return;
    const current = currentSessionRef.current;
    const activityKey = current ? getBrowserSessionActivityKey(current.access_token) : null;
    if (expectedKey && expectedKey !== activityKey) return;

    signingOutRef.current = true;
    if (activityKey) closeBrowserSessionActivity(activityKey);
    setLoading(true);
    clearState();

    try {
      // Keep the stored token available until Supabase can revoke this session.
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
    } catch (error) {
      await cleanupAuthState();
      errorManager.error('Auth', 'تعذّر إنهاء الجلسة على الخادم', error, false);
    } finally {
      signingOutRef.current = false;
      if (mountedRef.current) {
        setLoading(false);
        if (reason === 'manual') {
          toast.success('تم تسجيل الخروج بنجاح');
        } else if (reason === 'idle') {
          toast.info('انتهت الجلسة بسبب عدم الاستخدام. سجّل الدخول للمتابعة.');
        }
      }
    }
  }, [clearState]);

  const applySession = useCallback((current: Session): boolean => {
    if (signingOutRef.current) return false;
    const activityKey = startBrowserSessionActivity(current.access_token);
    currentSessionRef.current = current;

    if (activityKey && browserSessionTimeRemaining(activityKey) === 0) {
      // Auth callbacks hold an SDK lock. Request sign-out after they return.
      setLoading(true);
      setTimeout(() => {
        if (mountedRef.current) void endSession('idle', activityKey);
      }, 0);
      return false;
    }

    setSession(current);
    setUser(current.user);
    setTimeout(() => {
      if (mountedRef.current && currentSessionRef.current?.user.id === current.user.id) {
        void fetchUserData(current.user.id);
      }
    }, 0);
    return true;
  }, [endSession, fetchUserData]);

  const activityKey = session ? getBrowserSessionActivityKey(session.access_token) : null;
  useEffect(() => {
    if (!activityKey) return;
    return watchBrowserSessionActivity(activityKey, () => void endSession('idle', activityKey));
  }, [activityKey, endSession]);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;
    let initialised = false;

    // 1. Set up listener FIRST (per Supabase docs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (!active) return;

        if (event === 'SIGNED_OUT') {
          const accessToken = currentSessionRef.current?.access_token;
          const signedOutKey = accessToken ? getBrowserSessionActivityKey(accessToken) : null;
          if (signedOutKey) closeBrowserSessionActivity(signedOutKey);
          clearState();
          if (!signingOutRef.current) setLoading(false);
          return;
        }

        if (signingOutRef.current) return;

        if (isValidSession(currentSession) && currentSession) {
          if (!applySession(currentSession)) return;
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
    supabase.auth.getSession().then(({ data: { session: currentSession }, error }) => {
      if (!active) return;
      initialised = true;
      if (signingOutRef.current) return;

      // إذا كان السيشن تالف (bad_jwt / missing sub claim) ننظفه فوراً
      const errMsg = error?.message?.toLowerCase() || '';
      const isBadJwt = errMsg.includes('jwt') || errMsg.includes('sub claim') || errMsg.includes('invalid claim');
      if (error && isBadJwt) {
        console.warn('🧹 تنظيف جلسة تالفة:', error.message);
        void endSession('invalid');
        return;
      }

      if (isValidSession(currentSession) && currentSession) {
        if (!applySession(currentSession)) return;
      } else if (currentSession) {
        void endSession('invalid');
        return;
      }
      setLoading(false);
    }).catch((err) => {
      console.error('getSession error:', err);
      if (active) void endSession('invalid');
    });

    return () => {
      active = false;
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      subscription.unsubscribe();
    };
  }, [isValidSession, applySession, clearState, endSession]);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      toast.success('تم تسجيل الدخول بنجاح');
      // Don't navigate here - let SupabaseProtectedRoute handle routing
      return { error: null };
    } catch (error) {
      const message = getAuthErrorMessage(error);
      return { error: new Error(message) };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName?: string, redirectTo?: string) => {
    try {
      setLoading(true);
      const safeRedirect = getSafeInternalRedirect(redirectTo) || '/create-organization';
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${safeRedirect}`,
          data: { full_name: fullName || '' },
        },
      });
      if (error) throw error;

      if (data.user && !data.user.email_confirmed_at) {
        toast.success('تم إنشاء الحساب! يرجى فحص بريدك الإلكتروني');
      } else {
        toast.success('تم إنشاء الحساب بنجاح');
        navigate(safeRedirect);
      }
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await endSession('manual');
    navigate('/login', { replace: true });
  };

  const setOrgRole = useCallback((role: string | null) => {
    setUserRole(role);
  }, []);

  const hasRole = useCallback((role: string): boolean => {
    if (!userRole) return false;
    if (!(userRole in ROLE_LEVELS) || !(role in ROLE_LEVELS)) {
      return false;
    }
    return ROLE_LEVELS[userRole] >= ROLE_LEVELS[role];
  }, [userRole]);

  const isLoggedIn = useCallback((): boolean => {
    return !!(user?.id && isValidSession(session)
      && (!activityKey || browserSessionTimeRemaining(activityKey) > 0));
  }, [user, session, activityKey, isValidSession]);

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
