import { useEffect } from 'react';
import { useOrgId } from '@/hooks/useOrgId';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { setMonitoringContext, initGlobalErrorTracking, trackPagePerformance } from '@/utils/monitoring';

/**
 * Initialize monitoring: sets context, starts global error tracking,
 * and tracks page performance. Place this in your app layout.
 */
export function useMonitoring() {
  const orgId = useOrgId();
  const { user } = useOptimizedAuth();

  useEffect(() => {
    setMonitoringContext(orgId || null, user?.id || null);
  }, [orgId, user?.id]);

  useEffect(() => {
    initGlobalErrorTracking();
  }, []);

  useEffect(() => {
    if (orgId) {
      trackPagePerformance();
    }
  }, [orgId, window.location.pathname]);
}
