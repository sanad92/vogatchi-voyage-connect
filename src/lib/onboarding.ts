import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

export type OnboardingIdentity = { orgId: string; userId: string };
export type CompanySetup = { website: string; tax_number: string };
export type EmployeeSetup = { full_name: string; phone: string; email: string; position: string };
export type CustomerSetup = { name: string; phone: string; email: string; nationality: string };
type Client = SupabaseClient<Database>;
type RecordKind = 'employee' | 'customer';
type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function requireIdentity(identity: OnboardingIdentity) {
  if (!identity.orgId || !identity.userId) throw new Error('اختر الشركة وسجّل الدخول أولاً');
}

const draftKey = (identity: OnboardingIdentity, kind: RecordKind) =>
  `onboarding-record:${identity.orgId}:${identity.userId}:${kind}`;

// Persist only opaque IDs before sending a write. A lost response, reload, or
// return to an earlier step must reuse the same row, not create another one.
export function onboardingRecordId(storage: DraftStorage, identity: OnboardingIdentity, kind: RecordKind) {
  requireIdentity(identity);
  const key = draftKey(identity, kind);
  const existing = storage.getItem(key);
  if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return existing;
  const id = crypto.randomUUID();
  storage.setItem(key, id);
  return id;
}

export function clearOnboardingRecordIds(storage: DraftStorage, identity: OnboardingIdentity) {
  for (const kind of ['employee', 'customer'] as const) storage.removeItem(draftKey(identity, kind));
}

export async function loadCompanySetup(client: Client, identity: OnboardingIdentity): Promise<CompanySetup> {
  requireIdentity(identity);
  const { data, error } = await client.from('organization_settings')
    .select('website,tax_number').eq('organization_id', identity.orgId).maybeSingle();
  if (error) throw error;
  return { website: data?.website ?? '', tax_number: data?.tax_number ?? '' };
}

export async function saveCompanySetup(client: Client, identity: OnboardingIdentity, company: CompanySetup) {
  requireIdentity(identity);
  const { data, error } = await client.from('organization_settings').upsert({
    organization_id: identity.orgId,
    website: company.website.trim() || null,
    tax_number: company.tax_number.trim() || null,
  }, { onConflict: 'organization_id' }).select('organization_id').single();
  if (error) throw error;
  if (data?.organization_id !== identity.orgId) throw new Error('تعذر تأكيد حفظ بيانات الشركة');
}

export async function saveOnboardingEmployee(client: Client, identity: OnboardingIdentity, employee: EmployeeSetup, id: string) {
  requireIdentity(identity);
  if (!employee.full_name.trim()) throw new Error('اكتب اسم الموظف أو اختر تخطي');
  const { data, error } = await client.from('employees').upsert({
    id,
    organization_id: identity.orgId,
    employee_code: `EMP-${id}`,
    full_name: employee.full_name.trim(),
    phone: employee.phone.trim() || null,
    email: employee.email.trim() || null,
    position: employee.position.trim() || null,
  }, { onConflict: 'id' }).select('id,organization_id').single();
  if (error) throw error;
  if (data?.id !== id || data.organization_id !== identity.orgId) throw new Error('تعذر تأكيد حفظ الموظف');
}

export async function saveOnboardingCustomer(client: Client, identity: OnboardingIdentity, customer: CustomerSetup, id: string) {
  requireIdentity(identity);
  if (!customer.name.trim()) throw new Error('اكتب اسم العميل أو اختر تخطي');
  const { data, error } = await client.from('customers').upsert({
    id,
    organization_id: identity.orgId,
    name: customer.name.trim(),
    phone: customer.phone.trim() || null,
    email: customer.email.trim() || null,
    nationality: customer.nationality.trim() || null,
    created_by: identity.userId,
  }, { onConflict: 'id' }).select('id,organization_id').single();
  if (error) throw error;
  if (data?.id !== id || data.organization_id !== identity.orgId) throw new Error('تعذر تأكيد حفظ العميل');
}

export async function completeOnboarding(client: Client, identity: OnboardingIdentity) {
  requireIdentity(identity);
  const { data, error } = await client.from('organizations')
    .update({ onboarding_completed: true }).eq('id', identity.orgId)
    .select('id,onboarding_completed').single();
  if (error) throw error;
  if (data?.id !== identity.orgId || !data.onboarding_completed) throw new Error('تعذر تأكيد إنهاء الإعداد');
}
