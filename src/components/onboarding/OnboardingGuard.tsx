
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

const OnboardingGuard = ({ children }: { children: ReactNode }) => {
  const { needsOnboarding, isLoading } = useOnboardingStatus();
  const location = useLocation();

  // Don't redirect if already on onboarding or subscription-expired
  if (location.pathname === '/onboarding' || location.pathname === '/subscription-expired') {
    return <>{children}</>;
  }

  if (isLoading) return null;

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export default OnboardingGuard;
