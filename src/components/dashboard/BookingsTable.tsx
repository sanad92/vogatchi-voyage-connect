import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const bookingTypes: Record<string, string> = { hotel: 'فندق', flight: 'طيران', transport: 'انتقالات', car_rental: 'تأجير سيارة', package: 'باقة', tour: 'رحلة' };
const statuses: Record<string, string> = { confirmed: 'مؤكد', completed: 'مكتمل', paid: 'مدفوع', pending: 'معلق', cancelled: 'ملغي', draft: 'مسودة' };
export default function BookingsTable() {
  const orgId = useOrgId();
  const query = useQuery({
    queryKey: ['dashboard-unified-bookings', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase.from('bookings')
        .select('id, booking_number, customer_name, booking_type, start_date, status, selling_price, currency')
        .eq('organization_id', orgId!).order('created_at', { ascending: false }).limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });
  return <Card><CardHeader><CardTitle>آخر الحجوزات</CardTitle></CardHeader><CardContent>
    {query.isLoading ? <p>جاري تحميل الحجوزات…</p> : query.error ? <p role="alert">تعذر تحميل الحجوزات. حاول مرة أخرى.</p> :
      <Table><TableHeader><TableRow><TableHead>المرجع</TableHead><TableHead>العميل</TableHead><TableHead>نوع الحجز</TableHead><TableHead>تاريخ الخدمة</TableHead><TableHead>الحالة</TableHead><TableHead>قيمة البيع</TableHead><TableHead>التفاصيل</TableHead></TableRow></TableHeader>
        <TableBody>{query.data?.map(booking => <TableRow key={booking.id}>
          <TableCell>{booking.booking_number}</TableCell><TableCell>{booking.customer_name}</TableCell><TableCell>{bookingTypes[booking.booking_type] || booking.booking_type || '—'}</TableCell>
          <TableCell>{booking.start_date || '—'}</TableCell><TableCell>{statuses[booking.status ?? ''] || booking.status || 'غير محدد'}</TableCell>
          <TableCell>{Number(booking.selling_price || 0).toLocaleString('ar-EG')} {booking.currency || 'EGP'}</TableCell>
          <TableCell><Button asChild variant="link"><Link to={`/bookings/${booking.id}/workspace`}>فتح الحجز</Link></Button></TableCell>
        </TableRow>)}{!query.data?.length && <TableRow><TableCell colSpan={7}>لا توجد حجوزات بعد.</TableCell></TableRow>}</TableBody>
      </Table>}
  </CardContent></Card>;
}
