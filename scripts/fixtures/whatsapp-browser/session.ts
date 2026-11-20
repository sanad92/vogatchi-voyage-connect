export const organization = 'synthetic-organization';
export const conversation = 'synthetic-conversation';
export const customer = 'synthetic-customer';
export const message = 'synthetic-message';
export const photoPath = 'fixtures/arabic.png';
export const revision = '2026-11-20T00:00:00.000Z';

export const useOptimizedAuth = () => ({ user: { id: 'synthetic-agent' } });
export const useOrgId = () => organization;
export const usePermissionCheck = () => ({
  hasPermission: (permission: string) => ['whatsapp_view', 'crm_view', 'crm_create', 'customers_edit'].includes(permission),
});
export const useSupabasePermissions = usePermissionCheck;
