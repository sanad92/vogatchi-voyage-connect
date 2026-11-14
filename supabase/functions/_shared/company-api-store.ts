import { createClient } from 'npm:@supabase/supabase-js@2.95.3';
import { isCompanyEnvironment, parseCompanyCredentials, type CompanyProvider } from './company-api-providers.ts';

export function companyApiStore() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('company_api_store_unavailable');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function loadCompanyApiConnection(organizationId: string, provider: CompanyProvider) {
  const { data, error } = await companyApiStore().rpc('company_api_connection_read', {
    _org_id: organizationId,
    _provider: provider,
  }).maybeSingle();
  if (error) throw new Error('company_api_store_unavailable');
  if (!data) return null;
  const row = data as { environment: unknown; credentials: unknown };
  const credentials = parseCompanyCredentials(provider, row.credentials);
  if (!credentials || !isCompanyEnvironment(row.environment)) throw new Error('company_api_configuration_invalid');
  return { environment: row.environment, credentials };
}
