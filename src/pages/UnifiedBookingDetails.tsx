
import { useParams, useNavigate } from 'react-router-dom';
import { useBookingDetails, useUnifiedBookings } from '@/hooks/useUnifiedBookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Hotel, Plane, Car, Truck, User, DollarSign, TrendingUp, TrendingDown, FileText, MessageCircle, RefreshCw } from 'lucide-react';
import AuditLogViewer from '@/components/audit/AuditLogViewer';
import BookingAccountingPanel from '@/components/bookings/BookingAccountingPanel';
import { toast } from 'sonner';

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
  const { updateBookingStatus } = useUnifiedBookings();

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">جاري التحميل...</div>;
  if (error || !booking) return <div className="p-8 text-center text-destructive">خطأ في تحميل الحجز</div>;

  const ti = typeInfo[booking.booking_type] || typeInfo.hotel;
  const TypeIcon = ti.icon;
  const profit = (booking.selling_price || 0) - (booking.cost_price || 0);
  const margin = booking.selling_price > 0 ? (profit / booking.selling_price) * 100 : 0;

  const handleStatusChange = async (newStatus: string) => {
    await updateBookingStatus.mutateAsync({ id: booking.id, status: newStatus as any });
    toast.success('تم تحديث الحالة');
  };

  const handleWhatsApp = () => {
    const phone = booking.customers?.phone;
    if (phone) {
      window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`مرحباً، بخصوص الحجز رقم ${booking.booking_number}`)}`, '_blank');
    } else {
      toast.error('لا يوجد رقم هاتف للعميل');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4" dir="rtl">
      {/* Header + Quick Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" onClick={() => navigate('/bookings')}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">تفاصيل الحجز</h1>
        <Badge variant="outline" className="mr-2">
          <TypeIcon className="h-3 w-3 ml-1" />{ti.label}
        </Badge>
        <div className="flex-1" />
        {/* Quick Actions */}
        <Select value={booking.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[140px]">
            <RefreshCw className="h-3 w-3 ml-1" />
            <SelectValue placeholder="تغيير الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">معلق</SelectItem>
            <SelectItem value="confirmed">مؤكد</SelectItem>
            <SelectItem value="completed">مكتمل</SelectItem>
            <SelectItem value="cancelled">ملغي</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => navigate(`/documents?booking_id=${booking.id}`)}>
          <FileText className="h-4 w-4 ml-1" />فاتورة
        </Button>
        <Button variant="outline" size="sm" onClick={handleWhatsApp}>
          <MessageCircle className="h-4 w-4 ml-1" />واتساب
        </Button>
      </div>

      {/* Profit Card */}
      <Card className={`border-2 ${profit >= 0 ? 'border-green-200 bg-green-50/50 dark:bg-green-950/10' : 'border-red-200 bg-red-50/50 dark:bg-red-950/10'}`}>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">سعر البيع</p>
              <p className="text-xl font-bold">{booking.selling_price?.toLocaleString()} {booking.currency}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">التكلفة</p>
              <p className="text-xl font-bold">{booking.cost_price?.toLocaleString()} {booking.currency}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">الربح</p>
              <div className={`flex items-center justify-center gap-1 text-xl font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {profit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                {profit.toLocaleString()} {booking.currency}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">هامش الربح</p>
              <p className={`text-xl font-bold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {margin.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />المعلومات العامة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="رقم الحجز" value={booking.booking_number} />
            <InfoRow label="الحالة" value={
              booking.booking_statuses
                ? <Badge style={{ backgroundColor: booking.booking_statuses.color, color: 'white' }}>{booking.booking_statuses.name_ar}</Badge>
                : <Badge>{booking.status}</Badge>
            } />
            <InfoRow label="تاريخ البداية" value={booking.start_date || '—'} />
            <InfoRow label="تاريخ النهاية" value={booking.end_date || '—'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />العميل والمورد</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <InfoRow label="العميل" value={booking.customer_name || booking.customers?.name || '—'} />
            {booking.customers?.phone && <InfoRow label="هاتف العميل" value={booking.customers.phone} />}
            {booking.customers?.email && <InfoRow label="إيميل العميل" value={booking.customers.email} />}
            <InfoRow label="المورد" value={booking.supplier_name || '—'} />
            <InfoRow label="الموظف" value={booking.employees?.full_name || '—'} />
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

      {/* Audit Log */}
      <AuditLogViewer targetTable="bookings" targetId={booking.id} title="سجل التدقيق" compact={true} showFilters={false} />
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
