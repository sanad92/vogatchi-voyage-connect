export type PermissionDataScope = 'none' | 'own' | 'team' | 'branch' | 'organization';

export interface CompanyPermissionGrant {
  granted: boolean;
  data_scope: PermissionDataScope;
}

export type CompanyPermissionProfile = Record<string, CompanyPermissionGrant>;

const DATA_SCOPES: ReadonlySet<string> = new Set([
  'none',
  'own',
  'team',
  'branch',
  'organization',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

/**
 * Normalize the JSON profile returned by get_org_permission_profile.
 * Invalid or partial payloads are ignored so a malformed response never grants access.
 */
export function normalizeCompanyPermissionProfile(value: unknown): CompanyPermissionProfile | null {
  if (!isRecord(value)) return null;

  const profile: CompanyPermissionProfile = {};
  for (const [permissionKey, rawGrant] of Object.entries(value)) {
    if (!isRecord(rawGrant) || typeof rawGrant.granted !== 'boolean') continue;
    const rawScope = rawGrant.data_scope;
    const dataScope = !rawGrant.granted
      ? 'none'
      : typeof rawScope === 'string' && DATA_SCOPES.has(rawScope)
        ? rawScope as PermissionDataScope
        : 'organization';
    profile[permissionKey] = { granted: rawGrant.granted, data_scope: dataScope };
  }

  return Object.keys(profile).length > 0 ? profile : null;
}

export function companyPermissionGranted(
  profile: CompanyPermissionProfile | null | undefined,
  permissionKey: string,
): boolean | null {
  if (!profile) return null;
  const grant = profile[permissionKey];
  return grant ? grant.granted : null;
}

export function companyPermissionScope(
  profile: CompanyPermissionProfile | null | undefined,
  permissionKey: string,
): PermissionDataScope {
  return profile?.[permissionKey]?.data_scope ?? 'none';
}
