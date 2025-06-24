
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { Navigate } from 'react-router-dom';
import AuthLayout from '@/components/auth/AuthLayout';
import AuthHeader from '@/components/auth/AuthHeader';
import LoginForm from '@/components/auth/LoginForm';
import LoadingSpinner from '@/components/auth/LoadingSpinner';

const Auth = () => {
  const { user, loading } = useOptimizedAuth();

  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <AuthLayout>
      <AuthHeader />
      <LoginForm />
      <div className="mt-6 text-center text-sm text-gray-600">
        <p>نظام محمي - للموظفين المصرح لهم فقط</p>
      </div>
    </AuthLayout>
  );
};

export default Auth;
