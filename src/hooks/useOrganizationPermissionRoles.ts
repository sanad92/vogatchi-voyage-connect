import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useOrgId } from '@/hooks/useOrgId';
import { callUntypedRpc } from '@/lib/supabaseRpc';

export type PermissionDataScope = 'none' | 'own' | 'team' | 'branch' | 'organization';

export interface OrganizationPermissionGrant {
  permission_key: string;
  granted: boolean;
  data_scope: PermissionDataScope;
}

export interface OrganizationPermissionRole {
  id: string;
  name: string;
  description: string | null;
  inherits_base_role: boolean;
  is_active: boolean;
  assigned_user_count: number;
  grants: OrganizationPermissionGrant[];
}

export interface OrganizationPermissionCatalogEntry {
  permission_key: string;
  module: string;
  label_ar: string;
  default_scope: PermissionDataScope;
  is_sensitive: boolean;
}

export interface OrganizationPermissionMember {
  user_id: string;
  full_name: string;
  email: string;
  base_role: string;
  assigned_role_ids: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const asString = (value: unknown): string => typeof value === 'string' ? value : '';

const asBoolean = (value: unknown): boolean => value === true;

const asScope = (value: unknown): PermissionDataScope => (
  value === 'own' || value === 'team' || value === 'branch' || value === 'organization'
    ? value
    : 'none'
);

const parseGrants = (value: unknown): OrganizationPermissionGrant[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || !asString(entry.permission_key)) return [];
    return [{
      permission_key: asString(entry.permission_key),
      granted: asBoolean(entry.granted),
      data_scope: asScope(entry.data_scope),
    }];
  });
};

const parseRoles = (value: unknown): OrganizationPermissionRole[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || !asString(entry.id) || !asString(entry.name)) return [];
    return [{
      id: asString(entry.id),
      name: asString(entry.name),
      description: typeof entry.description === 'string' ? entry.description : null,
      inherits_base_role: asBoolean(entry.inherits_base_role),
      is_active: entry.is_active !== false,
      assigned_user_count: typeof entry.assigned_user_count === 'number' ? entry.assigned_user_count : 0,
      grants: parseGrants(entry.grants),
    }];
  });
};

const parseCatalog = (value: unknown): OrganizationPermissionCatalogEntry[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || !asString(entry.permission_key)) return [];
    return [{
      permission_key: asString(entry.permission_key),
      module: asString(entry.module) || 'general',
      label_ar: asString(entry.label_ar) || asString(entry.permission_key),
      default_scope: asScope(entry.default_scope),
      is_sensitive: asBoolean(entry.is_sensitive),
    }];
  });
};

const parseMembers = (value: unknown): OrganizationPermissionMember[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!isRecord(entry) || !asString(entry.user_id)) return [];
    const assigned = Array.isArray(entry.assigned_role_ids)
      ? entry.assigned_role_ids.filter((id): id is string => typeof id === 'string')
      : [];
    return [{
      user_id: asString(entry.user_id),
      full_name: asString(entry.full_name),
      email: asString(entry.email),
      base_role: asString(entry.base_role),
      assigned_role_ids: assigned,
    }];
  });
};

export const useOrganizationPermissionRoles = () => {
  const orgId = useOrgId();
  const queryClient = useQueryClient();
  const enabled = Boolean(orgId);

  const rolesQuery = useQuery({
    queryKey: ['organization-permission-roles', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await callUntypedRpc<unknown>('list_org_permission_roles', { _org_id: orgId });
      if (error) throw error;
      return parseRoles(data);
    },
    enabled,
  });

  const catalogQuery = useQuery({
    queryKey: ['organization-permission-catalog'],
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<unknown>('list_org_permission_catalog');
      if (error) throw error;
      return parseCatalog(data);
    },
    enabled,
    staleTime: 5 * 60_000,
  });

  const membersQuery = useQuery({
    queryKey: ['organization-permission-members', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await callUntypedRpc<unknown>('list_org_permission_members', { _org_id: orgId });
      if (error) throw error;
      return parseMembers(data);
    },
    enabled,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['organization-permission-roles', orgId] });
    void queryClient.invalidateQueries({ queryKey: ['organization-permission-members', orgId] });
    void queryClient.invalidateQueries({ queryKey: ['my-company-permission-profile', orgId] });
  };

  const createRole = useMutation({
    mutationFn: async (input: { name: string; description?: string; inheritsBaseRole: boolean }) => {
      if (!orgId) throw new Error('لم يتم تحديد المؤسسة');
      const { data, error } = await callUntypedRpc<string>('create_org_permission_role', {
        _org_id: orgId,
        _name: input.name,
        _description: input.description || null,
        _inherits_base_role: input.inheritsBaseRole,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => { invalidate(); toast.success('تم إنشاء الدور المخصص'); },
    onError: (error: Error) => toast.error(error.message || 'تعذر إنشاء الدور'),
  });

  const setGrant = useMutation({
    mutationFn: async (input: { roleId: string; permissionKey: string; granted: boolean; dataScope: PermissionDataScope }) => {
      if (!orgId) throw new Error('لم يتم تحديد المؤسسة');
      const { error } = await callUntypedRpc('set_org_permission_grant', {
        _org_id: orgId,
        _role_id: input.roleId,
        _permission_key: input.permissionKey,
        _granted: input.granted,
        _data_scope: input.granted ? input.dataScope : 'none',
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message || 'تعذر تحديث الصلاحية'),
  });

  const assignRole = useMutation({
    mutationFn: async (input: { userId: string; roleId: string; assigned: boolean }) => {
      if (!orgId) throw new Error('لم يتم تحديد المؤسسة');
      const { error } = await callUntypedRpc('assign_org_permission_role', {
        _org_id: orgId,
        _user_id: input.userId,
        _role_id: input.roleId,
        _assigned: input.assigned,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (error: Error) => toast.error(error.message || 'تعذر تحديث تعيين الدور'),
  });

  return {
    roles: rolesQuery.data ?? [],
    catalog: catalogQuery.data ?? [],
    members: membersQuery.data ?? [],
    isLoading: rolesQuery.isLoading || catalogQuery.isLoading || membersQuery.isLoading,
    error: rolesQuery.error || catalogQuery.error || membersQuery.error,
    createRole: createRole.mutate,
    setGrant: setGrant.mutate,
    assignRole: assignRole.mutate,
    isCreating: createRole.isPending,
    isUpdating: setGrant.isPending || assignRole.isPending,
  };
};
