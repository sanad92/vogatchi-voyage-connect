
import { createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AuthContextType } from '@/types/auth';
import { useAuthState } from './useAuthState';
import { cleanupAuthState, hasRoleAccess, isSuperAdmin, canDeleteData, canEditAllData, canManageSystem } from '@/utils/authHelpers';
import { handleError, withRetry } from '@/utils/errorHandling';

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
      
      // التحقق من صحة المدخلات
      if (!email || !email.trim()) {
        throw new Error('البريد الإلكتروني مطلوب');
      }
      
      if (!password || password.length < 6) {
        throw new Error('كلمة المرور يجب أن تكون على الأقل 6 أحرف');
      }

      // تنظيف حالة المصادقة السابقة
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('تحذير: فشل في تسجيل الخروج السابق:', err);
      }
      
      // محاولة تسجيل الدخول مع retry
      const result = await withRetry(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        
        if (error) {
          console.error('❌ خطأ في تسجيل الدخول:', error);
          
          // رسائل خطأ محسنة
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('البريد الإلكتروني أو كلمة المرور غير صحيحة');
          } else if (error.message.includes('Email not confirmed')) {
            throw new Error('يجب تأكيد البريد الإلكتروني أولاً');
          } else if (error.message.includes('Too many requests')) {
            throw new Error('محاولات دخول كثيرة. يرجى المحاولة لاحقاً');
          } else {
            throw new Error(error.message || 'فشل في تسجيل الدخول');
          }
        }
        
        return data;
      }, 2, 1000);
      
      console.log('✅ تم تسجيل الدخول بنجاح');
      toast.success('تم تسجيل الدخول بنجاح', {
        description: 'مرحباً بك في نظام Vogatchi CRM'
      });
      
      // التوجه للصفحة الرئيسية بعد تأخير قصير للسماح بتحميل البيانات
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
      
      return { error: null };
      
    } catch (error) {
      console.error('❌ خطأ عام في تسجيل الدخول:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'فشل في تسجيل الدخول';
      toast.error('خطأ في تسجيل الدخول', {
        description: errorMessage
      });
      
      handleError(error, 'signIn');
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      console.log('👋 جاري تسجيل الخروج...');
      
      // تنظيف حالة المصادقة أولاً
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (error) {
        console.error('خطأ في تسجيل الخروج:', error);
      }
      
      // تنظيف الحالة المحلية
      setUser(null);
      setProfile(null);
      setUserRole(null);
      setSession(null);
      
      toast.success('تم تسجيل الخروج بنجاح', {
        description: 'نراك قريباً'
      });
      
      // التوجه لصفحة المصادقة
      setTimeout(() => {
        window.location.href = '/auth';
      }, 500);
      
    } catch (error) {
      console.error('خطأ في تسجيل الخروج:', error);
      handleError(error, 'signOut');
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

  // التحقق من حالة تسجيل الدخول مع فحوصات إضافية
  const isLoggedIn = (): boolean => {
    const hasValidUser = !!(user && user.email);
    const hasValidProfile = !!(profile && profile.is_active);
    const hasValidRole = !!userRole;
    const hasValidSession = !!(session && session.access_token);
    
    const result = hasValidUser && hasValidProfile && hasValidRole && hasValidSession;
    
    console.log('🔍 isLoggedIn() - فحص حالة تسجيل الدخول:', {
      hasValidUser,
      hasValidProfile,
      hasValidRole,
      hasValidSession,
      result,
      userEmail: user?.email,
      profileActive: profile?.is_active,
      userRole
    });
    
    return result;
  };

  // تشخيص حالة المصادقة الحالية
  console.log('🧩 حالة المصادقة الحالية:', {
    loading,
    hasUser: !!user,
    hasProfile: !!profile,
    hasRole: !!userRole,
    hasSession: !!session,
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
    isLoading: loading,
    signIn,
    signOut,
    hasRole,
    isSuperAdmin: isSuperAdminUser,
    isLoggedIn,
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
