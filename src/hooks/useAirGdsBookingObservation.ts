import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type AirGdsProvider = 'amadeus' | 'travelport';
export interface AirGdsBookingObservation {
  provider: AirGdsProvider;
  state: 'not_configured' | 'enterprise_contract_required' |
    'reference_not_linked' | 'provider_unavailable' | 'provider_reservation_observed';
  environment?: 'preproduction' | 'production';
  checkedAt?: string;
  reservationStatus?: 'CONFIRMED' | 'CANCELLED' | 'SCHEDULE_CHANGE' |
    'PENDING' | 'WAITLISTED' | 'UNKNOWN';
  scheduleChangeFlag?: boolean;
  bookingReferenceMatched?: true;
  ticketingVerified?: false;
  externalProviderVerification: 'not_performed' | 'reservation_status_only';
  amendmentExecutionVerified: false;
  caveat?: string;
}

/** Explicit user click, never automatic polling or modification. */
export function useAirGdsBookingObservation() {
  return useMutation({
    mutationFn: async (input: { requestId: string; provider: AirGdsProvider }) => {
      const { data, error } = await supabase.functions.invoke(
        'trip-file-air-gds-status', {body:input},
      );
      if (error) throw error;
      const record = data as Partial<AirGdsBookingObservation> | null;
      const states = ['not_configured','enterprise_contract_required',
        'reference_not_linked','provider_unavailable','provider_reservation_observed'];
      if (!record || !states.includes(record.state || '')
        || record.provider !== input.provider
        || record.amendmentExecutionVerified !== false
        || !['not_performed','reservation_status_only']
          .includes(record.externalProviderVerification || '')
        || (record.state === 'provider_reservation_observed'
          && (record.externalProviderVerification !== 'reservation_status_only'
          || record.bookingReferenceMatched !== true
          || record.ticketingVerified !== false))) {
        throw new Error('استجابة المزود غير صالحة للتحقق');
      }
      return record as AirGdsBookingObservation;
    },
  });
}
