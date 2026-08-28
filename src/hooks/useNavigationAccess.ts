import { useCallback } from 'react';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useSupabasePermissions } from '@/hooks/useSupabasePermissions';
import { useSubscription } from '@/contexts/SubscriptionContext';
import type { NavigationScreen } from '@/config/moduleNavigation';

export const useNavigationAccess = () => {
  const { isSuperAdmin } = useOptimizedAuth();
  const { hasPermission } = useSupabasePermissions();
  const { hasFeature } = useSubscription();

  const canAccessScreen = useCallback((item: NavigationScreen): boolean => {
    if (isSuperAdmin()) return true;
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) return false;
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) return false;
    return true;
  }, [hasFeature, hasPermission, isSuperAdmin]);

  return { canAccessScreen };
};

