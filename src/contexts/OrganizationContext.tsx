
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';

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

  const fetchOrganizations = async () => {
    if (!user?.id) {
      setCurrentOrganization(null);
      setOrganizations([]);
      setLocalOrgRole(null);
      setOrgRole(null);
      setLoading(false);
      return;
    }

    try {
      const { data: memberships, error: memError } = await supabase
        .from('organization_members')
        .select('organization_id, role, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (memError || !memberships?.length) {
        setCurrentOrganization(null);
        setOrganizations([]);
        setLocalOrgRole(null);
        setOrgRole(null);
        setLoading(false);
        return;
      }

      const orgIds = memberships.map((m: OrganizationMember) => m.organization_id);

      const { data: orgs, error: orgError } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)
        .eq('is_active', true);

      if (orgError || !orgs?.length) {
        setCurrentOrganization(null);
        setOrganizations([]);
        setLocalOrgRole(null);
        setOrgRole(null);
        setLoading(false);
        return;
      }

      setOrganizations(orgs as Organization[]);

      const savedOrgId = localStorage.getItem(`current_org_${user.id}`);
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

    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [user?.id]);

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
    loading,
    hasOrganization: !!currentOrganization,
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
