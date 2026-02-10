import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { Navigate } from 'react-router-dom';

interface SupabaseProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const SupabaseProtectedRoute = ({ children, requiredRole }: SupabaseProtectedRouteProps) => {
  const { user, profile, loading, hasRole, isSuperAdmin, isLoggedIn } = useSupabaseAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn()) {
    return <Navigate to="/" replace />;
  }

  // التحقق من أن الحساب نشط
  if (profile && !profile.is_active) {
    return (
      <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-orange-600 mb-4">حسابك غير مفعل</h2>
          <p className="text-gray-600 mb-4">حسابك غير مفعل حالياً.</p>
          <p className="text-sm text-gray-500">يرجى التواصل مع السوبر أدمن لتفعيل حسابك.</p>
        </div>
      </div>
    );
  }

  // التحقق من الدور المطلوب
  if (requiredRole && !hasRole(requiredRole) && !isSuperAdmin()) {
    return (
      <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">ليس لديك صلاحية للوصول</h2>
          <p className="text-gray-600 mb-4">عذراً، لا تملك الصلاحيات المطلوبة لعرض هذه الصفحة.</p>
          <p className="text-sm text-gray-500">دورك الحالي: {profile?.employee_id ? 'موظف' : 'مستخدم'}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default SupabaseProtectedRoute;