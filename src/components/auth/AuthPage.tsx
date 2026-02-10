import { Navigate } from 'react-router-dom';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import SupabaseAuthForm from '@/components/auth/SupabaseAuthForm';

const AuthPage = () => {
  const { user, loading, isLoggedIn } = useSupabaseAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  // إذا كان المستخدم مسجل الدخول، توجيهه للداشبورد
  if (isLoggedIn()) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <SupabaseAuthForm />
    </div>
  );
};

export default AuthPage;
