export interface EvidenceSnapshot {
  status_at_link: string | null;
  currency_at_link: string | null;
  amount_at_link: number | null;
}
export interface CurrentSourceRecord {
  status: string | null;
  currency: string | null;
  amount: number | null;
}
export type EvidenceReconciliation = 'not_in_current_records' | 'details_changed' | 'details_match';

/**
 * A comparison of the original, current finance row and historical link.
 * Matching values NEVER means a payment has cleared or a refund is complete.
 */
export function assessEvidenceReconciliation(
  previous: EvidenceSnapshot,
  current: CurrentSourceRecord | undefined,
): EvidenceReconciliation {
  if (!current) return 'not_in_current_records';
  const normalized = (v: string | null) => (v || '').trim().toUpperCase();
  const statusMatch = normalized(previous.status_at_link) === normalized(current.status);
  const currencyMatch = normalized(previous.currency_at_link) === normalized(current.currency);
  const amountMatch = previous.amount_at_link == null && current.amount == null
    || previous.amount_at_link != null && current.amount != null
      && Number.isFinite(previous.amount_at_link) && Number.isFinite(current.amount)
      && Math.abs(previous.amount_at_link - current.amount) <= 0.005;
  return statusMatch && currencyMatch && amountMatch ? 'details_match' : 'details_changed';
}
