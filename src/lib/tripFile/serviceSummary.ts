import type { LinkedServiceBooking } from '@/hooks/useBookingServices';

export interface ServiceCurrencyGroup {
  currency: string | null;
  count: number;
  totalSelling: number;
  totalCost: number;
  indicativeGrossProfit: number;
  zeroCostRecords: number;
  incompleteNumbers: number;
}

/**
 * Read-only overview. Do NOT convert or add different currencies. Do NOT
 * book these calculated amounts into invoices, margins or accounting reports.
 * Hotel costs in the linked-service query are derived from nightly estimates.
 */
export function groupLinkedServicesByCurrency(
  services: Pick<LinkedServiceBooking, 'currency' | 'selling' | 'cost'>[],
): ServiceCurrencyGroup[] {
  const grouped = new Map<string, ServiceCurrencyGroup>();

  for (const service of services) {
    const raw = service.currency?.trim().toUpperCase() ?? '';
    const currency = /^[A-Z]{3}$/.test(raw) ? raw : null;
    const key = currency ?? '__unknown__';
    let entry = grouped.get(key);
    if (!entry) {
      entry = {
        currency,
        count: 0,
        totalSelling: 0,
        totalCost: 0,
        indicativeGrossProfit: 0,
        zeroCostRecords: 0,
        incompleteNumbers: 0,
      };
      grouped.set(key, entry);
    }

    entry.count += 1;
    const validSelling = Number.isFinite(service.selling);
    const validCost = Number.isFinite(service.cost);
    if (!validSelling || !validCost) {
      entry.incompleteNumbers += 1;
      continue;
    }
    entry.totalSelling += service.selling;
    entry.totalCost += service.cost;
    if (service.cost === 0) entry.zeroCostRecords += 1;
  }

  return [...grouped.values()]
    .map(entry => ({
      ...entry,
      // Only return the delta for a complete group, otherwise null is
      // represented by incompleteNumbers and the UI must NOT show a profit.
      indicativeGrossProfit: entry.incompleteNumbers ? NaN : entry.totalSelling - entry.totalCost,
    }))
    .sort((a, b) => {
      if (a.currency === null) return 1;
      if (b.currency === null) return -1;
      return a.currency.localeCompare(b.currency);
    });
}
