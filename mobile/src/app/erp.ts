import { createClient } from '@supabase/supabase-js';
import type { Database } from '@safar-db';
import { runtime } from '../runtime.generated';

type Tables = Database['public']['Tables'];
export type Booking = Pick<Tables['bookings']['Row'],
  'id' | 'booking_number' | 'customer_name' | 'booking_type' | 'start_date' | 'end_date' | 'status'>;
export type Customer = Pick<Tables['customers']['Row'], 'id' | 'name' | 'email' | 'phone'>;
export type CustomerContact = Partial<Pick<Customer, 'name' | 'email' | 'phone'>>;
export type Organization = Pick<Tables['organizations']['Row'], 'id' | 'name'> & { role: string };
export interface Overview {
  todayBookings: number;
  customers: number;
  recent: Booking[];
}
export interface ListPage<T> { rows: T[]; more: boolean }

// Keep credentials in memory. A fresh app launch requires authentication.
const sessionValues = new Map<string, string>();
export const erp = createClient<Database>(runtime.supabaseUrl, runtime.supabaseKey, {
  auth: {
    storage: {
      getItem: key => sessionValues.get(key) ?? null,
      setItem: (key, value) => { sessionValues.set(key, value); },
      removeItem: key => { sessionValues.delete(key); },
    },
    storageKey: 'safarerp-mobile-session',
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export async function endMobileSession() {
  try {
    const { error } = await erp.auth.signOut({ scope: 'local' });
    return !error;
  } catch {
    return false;
  } finally {
    sessionValues.clear();
  }
}

export async function listOrganizations(userId: string, signal: AbortSignal): Promise<Organization[]> {
  const memberships = await erp.from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId).eq('is_active', true).abortSignal(signal);
  if (memberships.error) throw memberships.error;
  if (!memberships.data.length) return [];

  const roles = new Map(memberships.data.map(member => [member.organization_id, member.role]));
  const organizations = await erp.from('organizations')
    .select('id, name').in('id', [...roles.keys()]).eq('is_active', true)
    .order('name').abortSignal(signal);
  if (organizations.error) throw organizations.error;
  return organizations.data.map(org => ({ ...org, role: roles.get(org.id) ?? 'viewer' }));
}

const bookingColumns = 'id, booking_number, customer_name, booking_type, start_date, end_date, status';
const customerColumns = 'id, name, email, phone';
const pageSize = 20;
const cleanSearch = (value: string) => value.trim().slice(0, 100)
  .replace(/[^\p{L}\p{M}\p{N}\s@.+-]/gu, ' ').replace(/\s+/g, ' ').trim();

const cairoDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Africa/Cairo', year: 'numeric', month: '2-digit', day: '2-digit',
});
export function cairoDate(date = new Date()) {
  const parts = Object.fromEntries(cairoDateFormat.formatToParts(date).map(part => [part.type, part.value]));
  return `${parts['year']}-${parts['month']}-${parts['day']}`;
}

export async function getOverview(org: string, signal: AbortSignal): Promise<Overview> {
  const today = cairoDate();
  const [daily, customers, recent] = await Promise.all([
    erp.from('bookings').select('id', { count: 'exact', head: true })
      .eq('organization_id', org).eq('is_demo', false).eq('start_date', today)
      .abortSignal(signal),
    erp.from('customers').select('id', { count: 'exact', head: true })
      .eq('organization_id', org).eq('is_demo', false).is('archived_at', null)
      .abortSignal(signal),
    erp.from('bookings').select(bookingColumns).eq('organization_id', org)
      .eq('is_demo', false).order('created_at', { ascending: false, nullsFirst: false })
      .order('id').limit(5).abortSignal(signal),
  ]);
  if (daily.error) throw daily.error;
  if (customers.error) throw customers.error;
  if (recent.error) throw recent.error;
  return { todayBookings: daily.count ?? 0, customers: customers.count ?? 0, recent: recent.data };
}

export async function listBookings(org: string, page: number, search: string, signal: AbortSignal): Promise<ListPage<Booking>> {
  let query = erp.from('bookings').select(bookingColumns)
    .eq('organization_id', org).eq('is_demo', false)
    .order('created_at', { ascending: false, nullsFirst: false }).order('id');
  const term = cleanSearch(search);
  if (term) query = query.or(`booking_number.ilike.%${term}%,customer_name.ilike.%${term}%`);
  const start = page * pageSize;
  const { data, error } = await query.range(start, start + pageSize).abortSignal(signal);
  if (error) throw error;
  return { rows: data.slice(0, pageSize), more: data.length > pageSize };
}

export async function listCustomers(org: string, page: number, search: string, signal: AbortSignal): Promise<ListPage<Customer>> {
  let query = erp.from('customers').select(customerColumns)
    .eq('organization_id', org).eq('is_demo', false).is('archived_at', null)
    .order('created_at', { ascending: false, nullsFirst: false }).order('id');
  const term = cleanSearch(search);
  if (term) query = query.or(`name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`);
  const start = page * pageSize;
  const { data, error } = await query.range(start, start + pageSize).abortSignal(signal);
  if (error) throw error;
  return { rows: data.slice(0, pageSize), more: data.length > pageSize };
}

export async function canEditCustomerContact(org: string, signal?: AbortSignal) {
  const permission = erp.rpc('has_org_permission', { _org_id: org, _permission: 'customers_edit' });
  const { data, error } = await (signal ? permission.abortSignal(signal) : permission);
  if (error) throw new Error('تعذّر التحقق من صلاحية تعديل العملاء.');
  return data === true;
}

export async function updateCustomerContact(org: string, current: Customer, contact: CustomerContact) {
  if (!(await canEditCustomerContact(org))) {
    throw new Error('ليس لديك صلاحية تعديل العملاء.');
  }

  let update = erp.from('customers').update(contact).eq('id', current.id).eq('organization_id', org)
    .eq('is_demo', false).is('archived_at', null);
  for (const field of ['name', 'email', 'phone'] as const) {
    if (contact[field] === undefined) continue;
    const previous = current[field];
    update = previous === null ? update.is(field, null) : update.eq(field, previous);
  }

  const { data, error } = await update.select(customerColumns).maybeSingle();
  if (error?.code === '23505') {
    throw new Error(/الهاتف|البريد/.test(error.message) ? error.message : 'رقم الهاتف أو البريد مسجل بالفعل.');
  }
  if (error?.code === '42501') throw new Error('الحساب لا يسمح بتعديل بيانات هذا العميل.');
  if (error) throw new Error('تعذّر حفظ بيانات العميل. حاول مرة أخرى.');
  if (!data) throw new Error('تعذّر حفظ التعديل. أغلق التفاصيل وحدّث قائمة العملاء قبل المحاولة.');
  return data;
}
