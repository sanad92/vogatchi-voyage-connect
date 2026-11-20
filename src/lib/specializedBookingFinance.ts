import type { QueryClient } from '@tanstack/react-query';

export interface SpecializedBookingDocumentFields {
  invoice_id?: string | null;
  invoice_document_status?: 'issued' | 'draft' | 'archived' | 'missing' | null;
  voucher_document_status?: 'issued' | 'awaiting_confirmation' | 'archived' | 'cancelled' | 'missing' | null;
  booking_status_code?: string | null;
}

export function formatSpecializedBookingTotals(entries: { amount: number | null | undefined; currency?: string | null }[]) {
  const totals = new Map<string, number>();
  for (const { amount, currency } of entries) {
    if (amount == null || !Number.isFinite(Number(amount))) continue;
    const code = currency?.trim().toUpperCase() || 'عملة غير محددة';
    totals.set(code, (totals.get(code) ?? 0) + Number(amount));
  }
  return [...totals].map(([currency, total]) => `${total.toLocaleString('ar-EG', { maximumFractionDigits: 2 })} ${currency}`).join(' · ') || '—';
}

export function hotelBookingStatus(booking: SpecializedBookingDocumentFields & { booking_status?: { name: string }; status_id?: string }) {
  const status = (booking.booking_status_code || booking.booking_status?.name || booking.status_id || 'pending').toLowerCase();
  if (status === 'canceled') return 'cancelled';
  if (status === 'draft') return 'pending';
  if (status === 'paid') return 'confirmed';
  return status;
}

const specializedBookingListKeys = [
  'hotel-bookings-unified',
  'flight-bookings-unified',
  'transport-bookings-unified',
  'car-rentals-unified',
];

export function invalidateSpecializedBookingLists(queryClient: QueryClient, organizationId?: string | null) {
  return Promise.all(specializedBookingListKeys.map(key =>
    queryClient.invalidateQueries({ queryKey: organizationId ? [key, organizationId] : [key] }),
  ));
}
