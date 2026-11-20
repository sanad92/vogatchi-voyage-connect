import { getSafeInternalRedirect } from './safeRedirect';

const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export type SubscriptionSelection = { planId: string; billing: 'monthly' | 'yearly' };

export function readSubscriptionSelection(params: URLSearchParams): SubscriptionSelection | null {
  if (params.getAll('plan').length !== 1 || params.getAll('billing').length > 1) return null;
  const planId = params.get('plan');
  const billing = params.get('billing') ?? 'monthly';
  if (!planId || !uuid.test(planId) || (billing !== 'monthly' && billing !== 'yearly')) return null;
  return { planId, billing };
}

export function readSubscriptionReturn(value: string | null) {
  const safe = getSafeInternalRedirect(value);
  if (!safe) return null;
  const target = new URL(safe, 'https://safar.invalid');
  return target.pathname === '/payment' ? readSubscriptionSelection(target.searchParams) : null;
}

export function subscriptionCheckoutPath(selection: SubscriptionSelection) {
  return `/payment?${new URLSearchParams({ plan: selection.planId, billing: selection.billing })}`;
}

export function isCustomSubscriptionPlan(name: string, localizedName: string) {
  return ['custom', 'customised', 'customized'].includes(name.trim().toLowerCase())
    || ['مخصص', 'مخصصة', 'باقة مخصصة', 'خطة مخصصة'].includes(localizedName.trim());
}
