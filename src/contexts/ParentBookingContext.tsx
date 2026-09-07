import { createContext, useCallback, useContext, type ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * When a service booking (hotel / flight / transport / car) is created from inside a
 * customer booking file (Booking Workspace), the created record must be linked to that
 * parent booking so it becomes part of the trip program and the customer account.
 */
const ParentBookingContext = createContext<string | null>(null);

export const ParentBookingProvider = ({
  bookingId,
  children,
}: {
  bookingId: string | null;
  children: ReactNode;
}) => (
  <ParentBookingContext.Provider value={bookingId}>{children}</ParentBookingContext.Provider>
);

export const useParentBookingId = (): string | null => useContext(ParentBookingContext);

export const syncParentBookingFinancials = async (bookingId: string) => {
  const { error } = await (supabase as any).rpc('sync_booking_financials', {
    p_booking_id: bookingId,
  });
  if (error) console.error('sync_booking_financials failed:', error);
};

/**
 * Returns helpers used by service-booking creation hooks:
 * - withParentBooking(payload): adds the parent booking link when applicable
 * - syncParent(): recalculates invoice / totals / profit of the parent booking
 */
export const useParentBookingLink = () => {
  const parentBookingId = useParentBookingId();

  const withParentBooking = useCallback(
    <T extends Record<string, any>>(payload: T): T =>
      parentBookingId ? ({ ...payload, booking_id: parentBookingId } as T) : payload,
    [parentBookingId],
  );

  const syncParent = useCallback(async () => {
    if (parentBookingId) await syncParentBookingFinancials(parentBookingId);
  }, [parentBookingId]);

  return { parentBookingId, withParentBooking, syncParent };
};
