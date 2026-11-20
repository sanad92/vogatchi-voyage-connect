type BookingVoucherState = { status?: string | null; workflow_stage?: string | null };

export function bookingVoucherState(booking?: BookingVoucherState | null): 'current' | 'cancelled' | 'unconfirmed' {
  if (booking?.status === 'cancelled' || booking?.status === 'canceled' || booking?.workflow_stage === 'cancelled') return 'cancelled';
  if (booking?.status === 'confirmed' || booking?.status === 'completed' || booking?.status === 'paid') return 'current';
  return 'unconfirmed';
}
