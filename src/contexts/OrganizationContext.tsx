
import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { getImpersonatingOrgId } from '@/hooks/useOrgImpersonation';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

interface OrganizationMember {
  organization_id: string;
  role: string;
  is_active: boolean;
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizationId: string | null;
  orgRole: string | null;
  organizations: Organization[];
  loading: boolean;
  hasOrganization: boolean;
  switchOrganization: (orgId: string) => void;
  refetchOrganization: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const OrganizationProvider = ({ children }: { children: ReactNode }) => {
  const { user, setOrgRole } = useOptimizedAuth();
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgRole, setLocalOrgRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedForUserId, setLoadedForUserId] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const fetchOrganizations = async () => {
    const targetUserId = user?.id ?? null;
    const requestId = ++requestIdRef.current;

    if (!targetUserId) {
      setCurrentOrganization(null);
      setOrganizations([]);
      setLocalOrgRole(null);
      setOrgRole(null);
      setLoadedForUserId(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Platform impersonation override: super admins can view a specific org
      const impersonateOrgId = getImpersonatingOrgId();
      if (impersonateOrgId) {
        const { data: roles } = await supabase
          .from('platform_roles')
          .select('role')
          .eq('user_id', targetUserId)
          .maybeSingle();

        if (roles) {
          const { data: org } = await supabase
            .from('organizations')
            .select('*')
            .eq('id', impersonateOrgId)
            .maybeSingle();

          if (requestId !== requestIdRef.current) return;

          if (org) {
            setOrganizations([org as Organization]);
            setCurrentOrganization(org as Organization);
            setLocalOrgRole('owner');
            setOrgRole('owner');
            setLoadedForUserId(targetUserId);
            return;
          }
        }
      }

      const { data: memberships, error: memError } = await supabase
        .from('organization_members')
        .select('organization_id, role, is_active')
        .eq('user_id', targetUserId)
        .eq('is_active', true);

      if (requestId !== requestIdRef.current) return;

      if (memError || !memberships?.length) {
        setCurrentOrganization(null);
        setOrganizations([]);
        setLocalOrgRole(null);
        setOrgRole(null);
        setLoadedForUserId(targetUserId);
        return;
      }

      const orgIds = memberships.map((m: OrganizationMember) => m.organization_id);

      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)
        .eq('is_active', true);

      if (requestId !== requestIdRef.current) return;

      if (orgError || !orgs?.length) {
        setCurrentOrganization(null);
        setOrganizations([]);
        setLocalOrgRole(null);
        setOrgRole(null);
        setLoadedForUserId(targetUserId);
        return;
      }

      setOrganizations(orgs as Organization[]);

      const savedOrgId = localStorage.getItem(`current_org_${targetUserId}`);
      const selectedOrg = savedOrgId 
        ? orgs.find((o: Organization) => o.id === savedOrgId) || orgs[0]
        : orgs[0];

      setCurrentOrganization(selectedOrg as Organization);
      
      const membership = memberships.find(
        (m: OrganizationMember) => m.organization_id === selectedOrg.id
      );
      const role = membership?.role || 'viewer';
      setLocalOrgRole(role);
      setOrgRole(role); // Sync to auth context
      setLoadedForUserId(targetUserId);

    } catch (error) {
      console.error('Error fetching organizations:', error);
      if (requestId !== requestIdRef.current) return;
      setCurrentOrganization(null);
      setOrganizations([]);
      setLocalOrgRole(null);
      setOrgRole(null);
      setLoadedForUserId(targetUserId);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (user?.id && loadedForUserId !== user.id) {
      setLoading(true);
    }
    fetchOrganizations();
  }, [user?.id]);

  const effectiveLoading = loading || (!!user?.id && loadedForUserId !== user.id);
  const hasOrganization = !!currentOrganization && !!user?.id && loadedForUserId === user.id;

  const switchOrganization = async (orgId: string) => {
    const org = organizations.find(o => o.id === orgId);
    if (!org || !user?.id) return;

    setCurrentOrganization(org);
    localStorage.setItem(`current_org_${user.id}`, orgId);

    // Fetch role for the new org
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .maybeSingle();

    const role = membership?.role || 'viewer';
    setLocalOrgRole(role);
    setOrgRole(role); // Sync to auth context
  };

  const value: OrganizationContextType = {
    currentOrganization,
    organizationId: currentOrganization?.id || null,
    orgRole,
    organizations,
    loading: effectiveLoading,
    hasOrganization,
    switchOrganization,
    refetchOrganization: fetchOrganizations,
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};
