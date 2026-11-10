import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HotelbedsBookingStatusObservation {
  state:
    | 'not_configured'
    | 'reference_not_linked'
    | 'provider_unavailable'
    | 'provider_booking_observed';
  provider?: 'hotelbeds_hotel';
  environment?: 'test' | 'production';
  providerBookingStatus?: 'CONFIRMED' | 'CANCELLED' | 'MODIFIED' | 'UNKNOWN';
  checkedAt?: string;
  externalProviderVerification: 'not_performed' | 'booking_status_only';
  amendmentExecutionVerified: false;
  message?: string;
  caveat?: string;
}

/**
 * Explicit manual action only. No polling, automatic supplier API requests
 * or direct provider credentials in the browser. Observation is transient.
 */
export function useHotelbedsBookingObservation() {
  return useMutation({
    mutationFn: async (requestId: string): Promise<HotelbedsBookingStatusObservation> => {
      const { data, error } = await supabase.functions.invoke(
        'trip-file-hotelbeds-status',
        { body: { requestId } },
      );
      if (error) throw error;
      const record = data as Partial<HotelbedsBookingStatusObservation> | null;
      if (!record || ![
        'not_configured', 'reference_not_linked',
        'provider_unavailable', 'provider_booking_observed',
      ].includes(record.state || '') ||
      record.amendmentExecutionVerified !== false ||
      !['not_performed','booking_status_only'].includes(record.externalProviderVerification || '')) {
        throw new Error('رد التحقق من المورد غير موثوق أو غير مكتمل');
      }
      return record as HotelbedsBookingStatusObservation;
    },
  });
}
