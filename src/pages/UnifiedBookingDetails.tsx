
import { useParams, useNavigate } from 'react-router-dom';
import { useBookingDetails } from '@/hooks/useUnifiedBookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Hotel, Plane, Car, Truck, User, Building2, Calendar, DollarSign } from 'lucide-react';

const typeInfo: Record<string, { label: string; icon: React.ElementType }> = {
  hotel: { label: 'حجز فندق', icon: Hotel },
  flight: { label: 'حجز طيران', icon: Plane },
  car_rental: { label: 'تأجير سيارات', icon: Car },
  transport: { label: 'نقل', icon: Truck },
};

const UnifiedBookingDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: booking, isLoading, error } = useBookingDetails(id || '');

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;
  if (error || !booking) return <div className="p-8 text-center text-destructive">خطأ في تحميل الحجز</div>;

  const ti = typeInfo[booking.booking_type] || typeInfo.hotel;
  const TypeIcon = ti.icon;

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4" dir="rtl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" onClick={() => navigate('/bookings')}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">تفاصيل الحجز</h1>
        <Badge variant="outline" className="mr-2">
          <TypeIcon className="h-3 w-3 ml-1" />{ti.label}
        </Badge>
      </div>

      {/* Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />المعلومات المالية</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="رقم الحجز" value={booking.booking_number} />
            <InfoRow label="سعر البيع" value={`${booking.selling_price?.toLocaleString()} ${booking.currency}`} />
            <InfoRow label="التكلفة" value={`${booking.cost_price?.toLocaleString()} ${booking.currency}`} />
            <InfoRow label="الربح" value={`${booking.profit?.toLocaleString()} ${booking.currency}`}
              className={booking.profit >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'} />
            <InfoRow label="الحالة" value={
              booking.booking_statuses
                ? <Badge style={{ backgroundColor: booking.booking_statuses.color, color: 'white' }}>{booking.booking_statuses.name_ar}</Badge>
                : <Badge>{booking.status}</Badge>
            } />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />العميل والمورد</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="العميل" value={booking.customer_name || booking.customers?.name || '—'} />
            {booking.customers?.phone && <InfoRow label="هاتف العميل" value={booking.customers.phone} />}
            <InfoRow label="المورد" value={booking.supplier_name || '—'} />
            <InfoRow label="الموظف" value={booking.employees?.full_name || '—'} />
            <InfoRow label="تاريخ البداية" value={booking.start_date || '—'} />
            <InfoRow label="تاريخ النهاية" value={booking.end_date || '—'} />
          </CardContent>
        </Card>
      </div>

      {/* Type-specific Details */}
      {booking.details && (
        <Card>
          <CardHeader><CardTitle>تفاصيل {ti.label}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(booking.details)
                .filter(([k]) => !['id', 'booking_id', 'created_at'].includes(k))
                .filter(([, v]) => v != null && v !== '')
                .map(([key, val]) => (
                  <InfoRow key={key} label={fieldLabels[key] || key} value={String(val)} />
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {booking.notes && (
        <Card>
          <CardHeader><CardTitle>ملاحظات</CardTitle></CardHeader>
          <CardContent><p className="text-muted-foreground">{booking.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
};

const InfoRow = ({ label, value, className = '' }: { label: string; value: any; className?: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-muted-foreground text-sm">{label}</span>
    <span className={`font-medium ${className}`}>{value}</span>
  </div>
);

const fieldLabels: Record<string, string> = {
  hotel_name: 'اسم الفندق', room_type: 'نوع الغرفة', board_type: 'الإقامة',
  check_in: 'تسجيل الدخول', check_out: 'تسجيل الخروج', nights: 'الليالي', rooms: 'الغرف',
  airline: 'شركة الطيران', flight_number: 'رقم الرحلة',
  departure_airport: 'مطار المغادرة', arrival_airport: 'مطار الوصول',
  departure_date: 'تاريخ المغادرة', departure_time: 'وقت المغادرة',
  ticket_number: 'رقم التذكرة', pnr: 'PNR',
  car_type: 'نوع السيارة', pickup_location: 'موقع الاستلام', dropoff_location: 'موقع التسليم',
  pickup_date: 'تاريخ الاستلام', dropoff_date: 'تاريخ التسليم', daily_rate: 'السعر اليومي',
  insurance_included: 'تأمين', vehicle_type: 'نوع المركبة', route: 'المسار',
  pickup_point: 'نقطة الالتقاط', dropoff_point: 'نقطة التوصيل', passengers: 'عدد الركاب',
};

export default UnifiedBookingDetails;
