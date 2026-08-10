import { useMyDepartments } from '@/hooks/useSop';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import { SALES_VIEW_COSTS_FLAG } from '@/lib/sopPricing';

/**
 * Internal profitability data (net cost, gross profit, margin, markup,
 * transfer net cost, internal reservations notes) is Reservations + Management
 * only. An org can opt Sales in via the `sales_view_pricing_costs` feature flag.
 */
export function useCanViewPricingCosts(): boolean {
  const { has, isLoading } = useMyDepartments();
  const flagEnabled = useFeatureFlag(SALES_VIEW_COSTS_FLAG);
  if (isLoading) return false;
  return has('reservations') || has('management') || flagEnabled;
}
