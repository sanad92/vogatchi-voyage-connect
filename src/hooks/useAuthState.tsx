
import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/auth';

interface AuthStateType {
  user: User | null;
  profile: Profile | null;
  userRole: string | null;
  session: Session | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setUserRole: (role: string | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthState = (): AuthStateType => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    console.log('📊 جاري تحميل بيانات المستخدم:', userId);
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('❌ خطأ في تحميل الملف الشخصي:', profileError);
        throw profileError;
      }

      console.log('✅ تم تحميل الملف الشخصي:', profileData);

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        console.error('⚠️ لم يتم العثور على دور للمستخدم:', roleError);
        setProfile(profileData);
        setUserRole(null);
        return;
      }

      console.log('✅ تم تحميل دور المستخدم:', roleData.role);
      setProfile(profileData);
      setUserRole(roleData.role);
    } catch (error) {
      console.error('❌ خطأ في تحميل بيانات المستخدم:', error);
      setProfile(null);
      setUserRole(null);
    }
  };

  useEffect(() => {
    console.log('🔄 إعداد مراقب حالة المصادقة...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔔 تغيير في حالة المصادقة:', { event, session: session?.user?.email });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👤 مستخدم مسجل دخول، جاري تحميل البيانات...');
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          console.log('👋 لا يوجد مستخدم مسجل');
          setProfile(null);
          setUserRole(null);
        }
        
        setLoading(false);
      }
    );

    // التحقق من الجلسة الحالية
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔍 فحص الجلسة الحالية:', session?.user?.email);
      
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

  return {
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
  };
};
