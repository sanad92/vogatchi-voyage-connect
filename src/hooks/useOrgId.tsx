
import { useOrganization } from '@/contexts/OrganizationContext';

/**
 * Utility hook that returns the current organization ID.
 * Use this in all data hooks to:
 * 1. Include organizationId in query keys (auto-refresh on org switch)
 * 2. Add organization_id to INSERT operations (required by RLS)
 * 
 * RLS policies handle SELECT/UPDATE/DELETE filtering automatically.
 */
export const useOrgId = () => {
  const { organizationId } = useOrganization();
  return organizationId;
};
