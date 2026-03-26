import { Navigate, useSearchParams } from 'react-router-dom';

import { useOrganization } from '@/contexts/OrganizationContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

import OrganizationSetupNotice from '@/components/auth/OrganizationSetupNotice';
import SupabaseAuthForm from '@/components/auth/SupabaseAuthForm';

const AuthPage = () => {
  const { loading, isLoggedIn } = useOptimizedAuth();
  const { hasOrganization, loading: orgLoading } = useOrganization();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'signin';

  const loggedIn = isLoggedIn();
  const loggedInWithoutOrganization = loggedIn && !hasOrganization;

  if (loading || orgLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (loggedIn && hasOrganization) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-bl from-blue-50 via-background to-indigo-50 flex items-center justify-center p-4">
      {loggedInWithoutOrganization ? (
        <div className="w-full max-w-md">
          <OrganizationSetupNotice />
        </div>
      ) : (
        <SupabaseAuthForm defaultTab={defaultTab} />
      )}
    </div>
  );
};

export default AuthPage;
