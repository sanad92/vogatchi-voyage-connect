import { useSopLeadForBooking } from '@/hooks/useSop';
import LeadAuditTimeline from '@/components/sop/LeadAuditTimeline';

/** Shows the lead audit trail inside the Booking Workspace once a booking exists. */
export const BookingLeadAudit = ({ bookingId }: { bookingId?: string | null }) => {
  const { data: lead } = useSopLeadForBooking(bookingId);
  if (!lead) return null;
  return <LeadAuditTimeline leadId={lead.id} title="مسار العميل من الاستقبال حتى الحجز" />;
};

export default BookingLeadAudit;
