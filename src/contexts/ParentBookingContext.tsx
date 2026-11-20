import { createContext, useCallback, useContext, type ReactNode } from 'react';
import type { Customer } from '@/types/customer';

/**
 * When a service booking (hotel / flight / transport / car) is created from inside a
 * customer booking file (Booking Workspace), the created record must be linked to that
 * parent booking so it becomes part of the trip program and the customer account.
 */
const ParentBookingContext = createContext<{ bookingId: string | null; customer: Customer | null; currency: string | null }>({
  bookingId: null, customer: null, currency: null,
});

export const ParentBookingProvider = ({
  bookingId,
  customer = null,
  currency = null,
  children,
}: {
  bookingId: string | null;
  customer?: Customer | null;
  currency?: string | null;
  children: ReactNode;
}) => (
  <ParentBookingContext.Provider value={{ bookingId, customer, currency }}>{children}</ParentBookingContext.Provider>
);

export const useParentBookingFields = () => useContext(ParentBookingContext);

export const useParentBookingLink = () => {
  const { bookingId: parentBookingId } = useParentBookingFields();

  const withParentBooking = useCallback(
    <T extends Record<string, any>>(payload: T): T =>
      parentBookingId ? ({ ...payload, booking_id: parentBookingId } as T) : payload,
    [parentBookingId],
  );

  return { parentBookingId, withParentBooking };
};
