import { addMonths, startOfMonth, subMonths } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

import { allRows } from './pagedRows';

export { allRows } from './pagedRows';
const DAY_MS = 86_400_000;

type Result<T> = { data: T[] | null; error: unknown };
type CountResult = { count: number | null; error: unknown };

async function counted(read: PromiseLike<CountResult>) {
  const { count, error } = await read;
  if (error) throw error;
  if (count === null) throw new Error('Missing platform count');
  return count;
}

async function listed<T>(read: PromiseLike<Result<T> & CountResult>) {
  const { data, count, error } = await read;
  if (error) throw error;
  if (!data || count === null) throw new Error('Missing platform data');
  return { rows: data, count };
}

export async function loadPlatformCompanies(signal: AbortSignal) {
  const [total, active, memberships, latest] = await Promise.all([
    counted(supabase.from('organizations').select('id', { count: 'exact', head: true }).abortSignal(signal)),
    counted(supabase.from('organizations').select('id', { count: 'exact', head: true }).eq('is_active', true).abortSignal(signal)),
    counted(supabase.from('organization_members').select('id', { count: 'exact', head: true }).abortSignal(signal)),
    supabase.from('organizations').select('id, name, is_active, created_at')
      .order('created_at', { ascending: false, nullsFirst: false }).order('id').limit(5).abortSignal(signal),
  ]);
  if (latest.error) throw latest.error;
  if (!latest.data) throw new Error('Missing platform data');
  return { total, active, memberships, latest: latest.data };
}

export function renewalWindow(now = new Date()) {
  return { start: now.toISOString(), end: new Date(now.getTime() + 7 * DAY_MS).toISOString() };
}

export function loadUpcomingRenewals(signal: AbortSignal) {
  const { start, end } = renewalWindow();
  return listed(supabase.from('subscriptions')
    .select('id, status, expires_at, organizations(name), subscription_plans(name, name_ar)', { count: 'exact' })
    .in('status', ['active', 'trialing']).lte('starts_at', start).gt('expires_at', start).lte('expires_at', end)
    .order('expires_at').order('id').limit(5).abortSignal(signal));
}

export function loadPendingTransfers(signal: AbortSignal) {
  return listed(supabase.from('bank_transfer_requests')
    .select('id, amount, currency, created_at, organizations(name)', { count: 'exact' })
    .eq('status', 'pending').order('created_at', { nullsFirst: false }).order('id').limit(4).abortSignal(signal));
}

export function loadSupportBacklog(signal: AbortSignal) {
  const active = () => supabase.from('support_tickets')
    .select('id', { count: 'exact', head: true }).not('status', 'in', '(resolved,closed)');
  return Promise.all([
    counted(active().abortSignal(signal)),
    counted(active().is('first_response_at', null).lt('sla_due_at', new Date().toISOString()).abortSignal(signal)),
  ]).then(([open, overdue]) => ({ open, overdue }));
}

export async function loadPlatformSubscriptions(signal: AbortSignal) {
  const now = new Date().toISOString();
  const rows = await allRows((from, to) => supabase.from('subscriptions')
    .select('id, plan_id, status, subscription_plans(name, name_ar)')
    .in('status', ['active', 'trialing']).lte('starts_at', now).or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('id').range(from, to).abortSignal(signal));
  const plans = new Map<string, { id: string; name: string | null; nameAr: string | null; count: number }>();
  let active = 0;
  for (const row of rows) {
    if (row.status === 'active') active += 1;
    const plan = plans.get(row.plan_id);
    if (plan) {
      plan.count += 1;
    } else {
      plans.set(row.plan_id, {
        id: row.plan_id,
        name: row.subscription_plans?.name ?? null,
        nameAr: row.subscription_plans?.name_ar ?? null,
        count: 1,
      });
    }
  }
  return { active, trialing: rows.length - active, plans: Array.from(plans.values()).sort((a, b) => b.count - a.count) };
}

export async function loadPlatformGrowth(months: number, signal: AbortSignal) {
  const now = new Date();
  const start = startOfMonth(subMonths(now, months - 1));
  const periods = Array.from({ length: months }, (_, index) => ({
    start: addMonths(start, index).getTime(),
    count: 0,
  }));
  const rows = await allRows((from, to) => supabase.from('organizations').select('created_at')
    .gte('created_at', start.toISOString()).lte('created_at', now.toISOString())
    .order('created_at').order('id').range(from, to).abortSignal(signal));

  for (const row of rows) {
    if (!row.created_at) continue;
    const date = new Date(row.created_at);
    const index = (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth();
    if (periods[index]) periods[index].count += 1;
  }
  return { periods, total: rows.length };
}

export async function loadPlatformCollections(signal: AbortSignal) {
  const now = new Date();
  const currentStart = startOfMonth(now).getTime();
  const previousStart = startOfMonth(subMonths(now, 1));
  const rows = await allRows((from, to) => supabase.from('bank_transfer_requests')
    .select('amount, currency, reviewed_at')
    .eq('status', 'approved').gte('reviewed_at', previousStart.toISOString()).lte('reviewed_at', now.toISOString())
    .order('reviewed_at').order('id').range(from, to).abortSignal(signal));
  const totals = new Map<string, { currency: string; current: number; previous: number }>();
  for (const row of rows) {
    if (!row.reviewed_at) continue;
    const currency = row.currency.trim().toUpperCase();
    const amounts = totals.get(currency) ?? { currency, current: 0, previous: 0 };
    const amount = Number(row.amount);
    if (new Date(row.reviewed_at).getTime() >= currentStart) amounts.current += amount;
    else amounts.previous += amount;
    totals.set(currency, amounts);
  }
  return Array.from(totals.values()).sort((a, b) => a.currency.localeCompare(b.currency));
}
