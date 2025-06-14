
import { createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { AuthContextType } from '@/types/auth';
import { useAuthState } from './useAuthState';
import { cleanupAuthState, hasRoleAccess } from '@/utils/authHelpers';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const {
    user,
    profile,
    userRole,
    session,
    loading,
    setUser,
    setProfile,
    setUserRole,
    setSession,
    setLoading
  } = useAuthState();

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
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
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (error) {
        console.error('Error signing out:', error);
      }
      
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSession(null);
      
      toast({
        title: "تم تسجيل الخروج",
        description: "نراك قريباً",
      });
      
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: string): boolean => {
    return hasRoleAccess(userRole, role);
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
