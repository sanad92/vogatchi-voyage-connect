import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useOrgId } from '@/hooks/useOrgId';
import { isRecordId } from '@/hooks/useCustomerContext';
import { supabase } from '@/integrations/supabase/client';

type LegacyBookingType = 'hotel' | 'flight';

async function resolveBookingId(orgId: string, id: string, type: LegacyBookingType) {
  const tablename = type === 'hotel' ? 'hotel_bookings' : 'flight_bookings';
  const { data: canonical, error: canonicalError } = await supabase.from('bookings')
    .select('id')
    .eq('organization_id', orgId)
    .eq('booking_type', type)
    .or(`id.eq.${id},and(legacy_table.eq.${tablename},legacy_id.eq.${id})`)
    .maybeSingle();
  if (canonicalError) throw canonicalError;
  if (canonical) return { canonicalId: canonical.id };

  const result = type === 'hotel'
    ? await supabase.from('hotel_bookings')
      .select('booking_id, customer_name, internal_booking_number, hotel_name, check_in_date, check_out_date')
      .eq('organization_id', orgId)
      .eq('id', id)
      .maybeSingle()
    : await supabase.from('flight_bookings')
      .select('booking_id, customer_name, booking_reference, flight_number, departure_date, arrival_date')
      .eq('organization_id', orgId)
      .eq('id', id)
      .maybeSingle();
  if (result.error) throw result.error;
  const legacy = result.data;
  if (!legacy) return null;

  const details = 'internal_booking_number' in legacy
    ? { reference: legacy.internal_booking_number, service: legacy.hotel_name, start: legacy.check_in_date, end: legacy.check_out_date }
    : { reference: legacy.booking_reference, service: legacy.flight_number, start: legacy.departure_date, end: legacy.arrival_date };
  const legacyDetails = { ...details, customer: legacy.customer_name };
  if (!legacy.booking_id) return { details: legacyDetails };

  const { data: parent, error: parentError } = await supabase.from('bookings')
    .select('id')
    .eq('organization_id', orgId)
    .eq('booking_type', type)
    .eq('id', legacy.booking_id)
    .maybeSingle();
  if (parentError) throw parentError;
  return parent ? { canonicalId: parent.id } : { details: legacyDetails };
}

export function LegacyBookingLink({ type }: { type: LegacyBookingType }) {
  const { id } = useParams();
  const { search, hash } = useLocation();
  const orgId = useOrgId();
  const booking = useQuery({
    queryKey: ['legacy-booking-link', orgId, type, id],
    enabled: Boolean(orgId && isRecordId(id)),
    queryFn: () => resolveBookingId(orgId!, id!, type),
  });

  if (booking.isLoading || !orgId) return <p className="p-6 text-center">جاري تحميل الحجز...</p>;
  if (booking.data?.canonicalId) return <Navigate replace to={`/bookings/${booking.data.canonicalId}${search}${hash}`} />;
  if (booking.data?.details) {
    const { reference, customer, service, start, end } = booking.data.details;
    return (
      <section className="mx-auto max-w-xl space-y-4 p-6" dir="rtl">
        <h1 className="text-xl font-bold">{type === 'hotel' ? 'حجز فندق' : 'حجز طيران'} {reference}</h1>
        <dl className="grid grid-cols-2 gap-3">
          <dt>العميل</dt><dd>{customer || '—'}</dd>
          <dt>{type === 'hotel' ? 'الفندق' : 'رقم الرحلة'}</dt><dd>{service || '—'}</dd>
          <dt>{type === 'hotel' ? 'الوصول' : 'المغادرة'}</dt><dd>{start || '—'}</dd>
          <dt>{type === 'hotel' ? 'المغادرة' : 'الوصول'}</dt><dd>{end || '—'}</dd>
        </dl>
        <Link className="text-primary underline" to={`/${type}-bookings`}>الرجوع إلى الحجوزات</Link>
      </section>
    );
  }
  return (
    <div className="space-y-3 p-6 text-center">
      <p role="alert">تعذر العثور على الحجز في الشركة الحالية.</p>
      <Link className="text-primary underline" to={`/${type}-bookings`}>الرجوع إلى الحجوزات</Link>
    </div>
  );
}
