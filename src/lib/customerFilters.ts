import type { Customer } from '@/types/customer';
import type { DateRange } from 'react-day-picker';

const nonBlank = (value: string | null | undefined) => Boolean(value?.trim());

export const isCustomerArchived = (customer: Customer) => Boolean(customer.archived_at);

export const hasCustomerCommunicationPreference = (
  customer: Customer,
  channel: 'whatsapp' | 'email' | 'sms',
) => customer.communication_preferences?.[channel] === true;

export const hasCustomerWhatsapp = (customer: Customer) => {
  if (!nonBlank(customer.phone) || customer.whatsapp_opt_out) return false;
  return customer.communication_preferences?.whatsapp !== false;
};

export const isVipCustomer = (customer: Customer) => {
  const segmentName = `${customer.segment?.name || ''} ${customer.segment?.name_ar || ''}`.toLowerCase();
  const egpSpend = Number(customer.spend_by_currency?.EGP ?? customer.total_spent ?? 0);
  return segmentName.includes('vip')
    || segmentName.includes('مميز')
    || Number(customer.total_bookings || 0) > 10
    || egpSpend >= 50_000;
};

export const matchesInclusiveDateRange = (
  value: string | null | undefined,
  range: DateRange | undefined,
) => {
  if (!range?.from && !range?.to) return true;
  if (!value) return false;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (range.from) {
    const from = new Date(range.from);
    from.setHours(0, 0, 0, 0);
    if (date < from) return false;
  }
  if (range.to) {
    const to = new Date(range.to);
    to.setHours(23, 59, 59, 999);
    if (date > to) return false;
  }
  return true;
};

