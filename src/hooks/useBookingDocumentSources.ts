import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrganization } from '@/hooks/useCurrentOrganization';
import { useBookingServices } from '@/hooks/useBookingServices';
import { useTripServiceAmendmentHistory } from '@/hooks/useTripServiceAmendments';
import type { DocSourceData, DocSpecialRequest } from '@/lib/travelDocuments';
import type { useBookingWorkspace } from '@/hooks/useBookingWorkspace';

type Workspace = ReturnType<typeof useBookingWorkspace>;
const recordId = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

/** Load the scoped service data and company copy used for a customer document. */
export const useBookingDocumentSources = (workspace: Workspace) => {
  const { booking, customer, itinerary } = workspace;
  const orgQ = useCurrentOrganization();
  const org = orgQ.data;
  const orgId = org?.id;
  const bookingId: string | undefined = booking?.organization_id === orgId ? booking?.id : undefined;
  const legacyHotelId: string | undefined = booking?.legacy_table === 'hotel_bookings' &&
    recordId.test(booking?.legacy_id ?? '') ? booking.legacy_id : undefined;

  const linkedQ = useBookingServices(bookingId);
  const amendmentsQ = useTripServiceAmendmentHistory(bookingId);

  const requestsQ = useQuery({
    queryKey: ['booking-special-requests', bookingId, orgId, legacyHotelId],
    enabled: !!bookingId && !!orgId,
    queryFn: async (): Promise<DocSpecialRequest[]> => {
      if (!bookingId || !orgId) return [];
      const requests = supabase
        .from('booking_special_requests')
        .select('id, booking_id, custom_request_text, special_request_type:special_request_types(name), hotel:hotel_bookings!inner(id, booking_id, hotel_name)')
        .eq('organization_id', orgId)
        .eq('hotel.organization_id', orgId)
        .order('created_at').order('id');
      const { data, error } = await (legacyHotelId
        ? requests.or(`booking_id.eq.${bookingId},id.eq.${legacyHotelId}`, { referencedTable: 'hotel' })
        : requests.eq('hotel.booking_id', bookingId));
      if (error) throw error;
      return data ?? [];
    },
  });

  const templatesQ = useQuery({
    queryKey: ['doc-templates-customer-copy', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('document_templates')
        .select('document_type, notes_text, terms_text, is_default')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data ?? [];
    },
  });

  const getSource = (documentType: 'invoice' | 'voucher'): DocSourceData => {
    const templates = templatesQ.data ?? [];
    return {
      booking, customer, org, itinerary,
      linkedServices: linkedQ.data,
      amendments: amendmentsQ.data,
      specialRequests: requestsQ.data,
      template:
        templates.find(t => t.document_type === documentType && t.is_default) ??
        templates.find(t => t.document_type === documentType) ?? null,
    };
  };

  const refreshVoucherSource = async (): Promise<DocSourceData> => {
    const [details, linked, amendments, requests, templates] = await Promise.all([
      workspace.refreshItinerary(), linkedQ.refetch(), amendmentsQ.refetch(), requestsQ.refetch(), templatesQ.refetch(),
    ]);
    if (!bookingId || [details, linked, amendments, requests, templates].some(result => result.isError)) {
      throw new Error('تعذّر تحديث بيانات الفاوتشر. أعد المحاولة.');
    }
    return {
      ...getSource('voucher'),
      itinerary: details.data,
      linkedServices: linked.data,
      amendments: amendments.data,
      specialRequests: requests.data,
      template: templates.data?.find(t => t.document_type === 'voucher' && t.is_default) ??
        templates.data?.find(t => t.document_type === 'voucher') ?? null,
    };
  };

  return {
    getSource,
    refreshVoucherSource,
    isReady: Boolean(bookingId && itinerary && linkedQ.isSuccess && amendmentsQ.isSuccess && requestsQ.isSuccess && templatesQ.isSuccess),
    isError: workspace.itineraryError || orgQ.isError || (orgQ.isSuccess && !org) ||
      linkedQ.isError || amendmentsQ.isError || requestsQ.isError || templatesQ.isError,
  };
};
