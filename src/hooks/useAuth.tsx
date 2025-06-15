
import { createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { AuthContextType } from '@/types/auth';
import { useAuthState } from './useAuthState';
import { cleanupAuthState, hasRoleAccess, isSuperAdmin, canDeleteData, canEditAllData, canManageSystem } from '@/utils/authHelpers';

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
        console.error('❌ خطأ في تسجيل الدخول:', error);
        toast({
          title: "خطأ في تسجيل الدخول",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log('✅ تم تسجيل الدخول بنجاح');
        toast({
          title: "تم تسجيل الدخول بنجاح",
          description: "مرحباً بك في نظام Vogatchi CRM",
        });
        window.location.href = '/';
      }
      
      return { error };
    } catch (error) {
      console.error('❌ خطأ عام في تسجيل الدخول:', error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('👋 جاري تسجيل الخروج...');
      
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
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
      console.error('خطأ في تسجيل الخروج:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (role: string): boolean => {
    console.log(`🔍 hasRole('${role}') - فحص الصلاحيات:`, {
      userRole,
      requestedRole: role,
      user: user?.email,
      profile: profile?.email
    });
    
    const result = hasRoleAccess(userRole, role);
    console.log(`✅ نتيجة hasRole('${role}'):`, result);
    return result;
  };

  const isSuperAdminUser = (): boolean => {
    const result = isSuperAdmin(userRole);
    console.log('🔍 isSuperAdmin() - فحص السوبر أدمن:', { 
      userRole, 
      result,
      user: user?.email 
    });
    return result;
  };

  // وظائف جديدة للسوبر أدمن
  const canDelete = (): boolean => {
    return canDeleteData(userRole);
  };

  const canEditAll = (): boolean => {
    return canEditAllData(userRole);
  };

  const canManageSystemSettings = (): boolean => {
    return canManageSystem(userRole);
  };

  // تشخيص حالة المصادقة الحالية
  console.log('🧩 حالة المصادقة الحالية:', {
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    hasRole: !!userRole,
    userEmail: user?.email,
    profileEmail: profile?.email,
    userRole,
    isActive: profile?.is_active,
    isSuperAdmin: isSuperAdminUser()
  });

  const value = {
    user,
    profile,
    userRole,
    session,
    loading,
    signIn,
    signOut,
    hasRole,
    isSuperAdmin: isSuperAdminUser,
    canDelete,
    canEditAll,
    canManageSystemSettings
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
