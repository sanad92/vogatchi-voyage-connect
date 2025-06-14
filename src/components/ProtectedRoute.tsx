
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, userRole, profile, loading, hasRole } = useAuth();

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

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // التحقق من أن المستخدم له profile وأنه نشط
  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-orange-600 mb-4">حسابك قيد المراجعة</h2>
          <p className="text-gray-600 mb-4">حسابك في انتظار تفعيل السوبر أدمن.</p>
          <p className="text-sm text-gray-500">يرجى الانتظار أو التواصل مع الإدارة.</p>
        </div>
      </div>
    );
  }

  if (!profile.is_active) {
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

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-orange-600 mb-4">لم يتم تعيين دور</h2>
          <p className="text-gray-600 mb-4">لم يتم تعيين دور لحسابك بعد.</p>
          <p className="text-sm text-gray-500">يرجى التواصل مع السوبر أدمن لتعيين دور لحسابك.</p>
        </div>
      </div>
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">ليس لديك صلاحية للوصول</h2>
          <p className="text-gray-600 mb-4">عذراً، لا تملك الصلاحيات المطلوبة لعرض هذه الصفحة.</p>
          <p className="text-sm text-gray-500">دورك الحالي: {userRole}</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
