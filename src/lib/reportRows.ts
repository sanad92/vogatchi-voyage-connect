import { supabase } from '@/integrations/supabase/client';
import { bookingStatusLabel } from '@/lib/bookingStatus';

type BookingReportScope = { start: string; end: string; service: string; status: string; currency: string };
type ReportQuery = { id: string | null };
const pageSize = 500;

export async function allReportRows<T extends ReportQuery>(
  load: (after: string | undefined, limit: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  let after: string | undefined;
  for (;;) {
    const { data, error } = await load(after, pageSize);
    if (error) throw error;
    if (!data?.length) return rows;
    const lastId = data[data.length - 1].id;
    if (!lastId || lastId === after) throw new Error('Invalid report row identifier');
    rows.push(...data);
    after = lastId;
  }
}

export function loadBookingReportRows(orgId: string, scope?: BookingReportScope) {
  return allReportRows((after, limit) => {
    let query = supabase.from('bookings').select('id, booking_number, booking_type, status, created_at, start_date, currency')
      .eq('organization_id', orgId).order('id').limit(limit);
    if (scope) {
      const endExclusive = new Date(`${scope.end}T00:00:00Z`);
      endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
      query = query.gte('created_at', `${scope.start}T00:00:00Z`).lt('created_at', endExclusive.toISOString());
      if (scope.service !== 'all') query = query.eq('booking_type', scope.service);
      if (scope.status === 'cancelled') query = query.in('status', ['cancelled', 'canceled']);
      else if (scope.status !== 'all') query = query.eq('status', scope.status);
      if (scope.currency !== 'all') query = query.eq('currency', scope.currency);
    }
    return after ? query.gt('id', after) : query;
  });
}

export const bookingServiceLabels: Record<string, string> = {
  hotel: 'فنادق',
  flight: 'طيران',
  transport: 'نقل',
  car_rental: 'تأجير سيارات',
  umrah: 'عمرة',
  hajj: 'حج',
};

export function bookingReportCells(booking: Awaited<ReturnType<typeof loadBookingReportRows>>[number]) {
  return [
    booking.booking_number,
    bookingServiceLabels[booking.booking_type] ?? booking.booking_type,
    bookingStatusLabel(booking.status),
    booking.created_at?.slice(0, 10),
    booking.start_date,
    booking.currency,
  ];
}

export const bookingReportColumns = ['رقم الحجز', 'نوع الخدمة', 'الحالة', 'تاريخ الإنشاء', 'تاريخ بدء الخدمة', 'العملة'];
