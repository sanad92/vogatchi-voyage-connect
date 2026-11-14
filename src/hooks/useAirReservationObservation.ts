import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AirReservationObservation {
  state:
    | 'not_configured' | 'enterprise_contract_required'
    | 'source_not_unambiguous' | 'provider_unavailable' | 'provider_pnr_observed';
  provider?: 'travelport' | 'amadeus_enterprise' | 'sabre';
  environment?: 'preproduction' | 'production';
  checkedAt?: string;
  airStatus?: 'confirmed' | 'cancelled' | 'pending' | 'modified'
    | 'rejected' | 'waitlisted' | 'mixed' | 'unknown';
  segmentStatusSamples?: number;
  externalProviderVerification?: 'not_performed' | 'pnr_status_only';
  ticketIssuanceVerified: false;
  amendmentExecutionVerified: false;
}

/**
 * Manual read-only provider observation. No polling or secrets in browser.
 * The request ID, not the PNR, is sent to the server.
 */
export function useAirReservationObservation() {
  return useMutation({
    mutationFn: async (requestId: string): Promise<AirReservationObservation> => {
      const { data, error } = await supabase.functions.invoke(
        'trip-file-air-reservation-status',
        { body: { requestId } },
      );
      if (error) throw error;
      const record = data as AirReservationObservation | null;
      if (!record || ![
        'not_configured', 'enterprise_contract_required', 'source_not_unambiguous',
        'provider_unavailable', 'provider_pnr_observed',
      ].includes(record.state) ||
      record.amendmentExecutionVerified !== false ||
      record.ticketIssuanceVerified !== false) {
        throw new Error('رد التحقق من الطيران غير مكتمل أو غير موثوق');
      }
      if (record.state === 'provider_pnr_observed' &&
        ((record.provider !== 'travelport' && record.provider !== 'sabre') ||
         record.externalProviderVerification !== 'pnr_status_only')) {
        throw new Error('لا يمكن اعتماد هذا الرد كقراءة PNR موثوقة');
      }
      return record;
    },
  });
}
