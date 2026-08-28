import type { Customer } from '@/types/customer';

export type CurrencyTotals = Record<string, number>;

export interface CustomerBookingMetricRow {
  customer_id: string;
  total_bookings: number | string | null;
  last_booking_date: string | null;
  spend_by_currency: unknown;
  booking_count_by_currency: unknown;
}

const cleanCurrency = (currency: string) => currency.trim().toUpperCase() || 'EGP';

export function parseCurrencyTotals(value: unknown): CurrencyTotals {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

  return Object.entries(value as Record<string, unknown>).reduce<CurrencyTotals>((totals, [currency, amount]) => {
    const numericAmount = Number(amount);
    if (Number.isFinite(numericAmount) && numericAmount !== 0) {
      totals[cleanCurrency(currency)] = numericAmount;
    }
    return totals;
  }, {});
}

export function getCustomerSpend(customer: Pick<Customer, 'spend_by_currency' | 'total_spent'>): CurrencyTotals {
  const totals = parseCurrencyTotals(customer.spend_by_currency);
  if (Object.keys(totals).length === 0 && Number(customer.total_spent || 0) !== 0) {
    totals.EGP = Number(customer.total_spent || 0);
  }
  return totals;
}

export function getCustomerSpendInCurrency(customer: Pick<Customer, 'spend_by_currency' | 'total_spent'>, currency = 'EGP') {
  return getCustomerSpend(customer)[cleanCurrency(currency)] || 0;
}

export function sumCurrencyTotals(values: CurrencyTotals[]): CurrencyTotals {
  return values.reduce<CurrencyTotals>((result, totals) => {
    for (const [currency, amount] of Object.entries(totals)) {
      result[currency] = (result[currency] || 0) + Number(amount || 0);
    }
    return result;
  }, {});
}

export function divideCurrencyTotals(totals: CurrencyTotals, divisors: CurrencyTotals | number): CurrencyTotals {
  return Object.entries(totals).reduce<CurrencyTotals>((result, [currency, amount]) => {
    const divisor = typeof divisors === 'number' ? divisors : Number(divisors[currency] || 0);
    if (divisor > 0) result[currency] = amount / divisor;
    return result;
  }, {});
}

export function formatMoney(amount: number, currency = 'EGP'): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: cleanCurrency(currency),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(amount || 0));
}

export function formatCurrencyTotals(totals: CurrencyTotals, emptyLabel = formatMoney(0, 'EGP')): string {
  const entries = Object.entries(totals)
    .filter(([, amount]) => Number.isFinite(amount) && amount !== 0)
    .sort(([a], [b]) => (a === 'EGP' ? -1 : b === 'EGP' ? 1 : a.localeCompare(b)));

  return entries.length ? entries.map(([currency, amount]) => formatMoney(amount, currency)).join(' + ') : emptyLabel;
}

export function customerGrowthRate(customers: Customer[] = [], days = 30, now = new Date()): number | null {
  const periodMs = days * 24 * 60 * 60 * 1000;
  const currentStart = now.getTime() - periodMs;
  const previousStart = currentStart - periodMs;
  let current = 0;
  let previous = 0;

  for (const customer of customers) {
    if (!customer.created_at) continue;
    const createdAt = new Date(customer.created_at).getTime();
    if (!Number.isFinite(createdAt)) continue;
    if (createdAt >= currentStart && createdAt <= now.getTime()) current += 1;
    else if (createdAt >= previousStart && createdAt < currentStart) previous += 1;
  }

  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function buildCustomerAnalytics(customers: Customer[] = [], timeframeDays = 30, now = new Date()) {
  const cutoff = now.getTime() - timeframeDays * 24 * 60 * 60 * 1000;
  const inactiveCutoff = now.getTime() - 90 * 24 * 60 * 60 * 1000;
  const bookedCustomers = customers.filter((customer) => Number(customer.total_bookings || 0) > 0);
  const repeatCustomers = bookedCustomers.filter((customer) => Number(customer.total_bookings || 0) >= 2);
  const inactiveCustomers = bookedCustomers.filter((customer) => {
    if (!customer.last_booking_date) return true;
    return new Date(customer.last_booking_date).getTime() < inactiveCutoff;
  });
  const activeCustomers = bookedCustomers.length - inactiveCustomers.length;
  const revenueByCurrency = sumCurrencyTotals(customers.map(getCustomerSpend));
  const bookingCountByCurrency = sumCurrencyTotals(
    customers.map((customer) => parseCurrencyTotals(customer.booking_count_by_currency)),
  );
  const customersByCurrency = customers.reduce<CurrencyTotals>((result, customer) => {
    for (const [currency, amount] of Object.entries(getCustomerSpend(customer))) {
      if (amount !== 0) result[currency] = (result[currency] || 0) + 1;
    }
    return result;
  }, {});

  return {
    totalCustomers: customers.length,
    newCustomers: customers.filter((customer) => {
      if (!customer.created_at) return false;
      const createdAt = new Date(customer.created_at).getTime();
      return Number.isFinite(createdAt) && createdAt >= cutoff && createdAt <= now.getTime();
    }).length,
    activeCustomers,
    bookedCustomers: bookedCustomers.length,
    repeatCustomers: repeatCustomers.length,
    inactiveCustomers: inactiveCustomers.length,
    revenueByCurrency,
    averageBookingValueByCurrency: divideCurrencyTotals(revenueByCurrency, bookingCountByCurrency),
    customerLifetimeValueByCurrency: divideCurrencyTotals(revenueByCurrency, customersByCurrency),
    retentionRate: bookedCustomers.length ? (repeatCustomers.length / bookedCustomers.length) * 100 : 0,
    churnRate: bookedCustomers.length ? (inactiveCustomers.length / bookedCustomers.length) * 100 : 0,
  };
}
