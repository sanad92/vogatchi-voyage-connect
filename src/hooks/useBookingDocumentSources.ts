import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import type { DocSourceData } from '@/lib/travelDocuments';

const anyClient = supabase as any;

type BaseSource = Pick<DocSourceData, 'booking' | 'customer' | 'itinerary'>;

/**
 * Collects the extra, customer-safe data needed to render travel documents
 * (special requests + the org's customer-facing template copy) and merges it
 * with the data already loaded by the Booking Workspace.
 */
export const useBookingDocumentSources = (base: BaseSource) => {
  const { data: org } = useCurrentOrganization();
  const bookingId = base.booking?.id as string | undefined;

  const requestsQ = useQuery({
    queryKey: ['booking-special-requests', bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data } = await anyClient
        .from('booking_special_requests')
        .select('id, custom_request_text, special_request_type:special_request_types(name)')
        .eq('booking_id', bookingId);
      return data ?? [];
    },
  });

  const templatesQ = useQuery({
    queryKey: ['doc-templates-customer-copy', org?.id],
    enabled: !!org?.id,
    queryFn: async () => {
      const { data } = await anyClient
        .from('document_templates')
        .select('document_type, notes_text, terms_text, is_default')
        .eq('organization_id', org!.id);
      return data ?? [];
    },
  });

  const templates: any[] = templatesQ.data ?? [];

  /** Build the source object for a given customer-facing document type. */
  const getSource = (documentType: 'invoice' | 'voucher'): DocSourceData => ({
    ...base,
    org,
    specialRequests: requestsQ.data ?? [],
    template:
      templates.find((t) => t.document_type === documentType && t.is_default) ??
      templates.find((t) => t.document_type === documentType) ??
      null,
  });

  return { getSource, org };
};
