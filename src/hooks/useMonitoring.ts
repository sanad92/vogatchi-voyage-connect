import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { isPlatformAdminHost } from '@/lib/platform-host';
import { startMonitoring } from '@/utils/monitoring';

export function MonitoringCollector() {
  const { pathname } = useLocation();
  const { organizationId, loading } = useOrganization();
  const { user } = useOptimizedAuth();
  const platform = isPlatformAdminHost() || pathname === '/platform' || pathname.startsWith('/platform/');
  const monitoredOrg = platform ? null : organizationId;
  const ready = platform || !loading;

  useEffect(() => {
    if (!user?.id || !ready) return;
    return startMonitoring(monitoredOrg, user.id);
  }, [monitoredOrg, ready, user?.id]);

  return null;
}
