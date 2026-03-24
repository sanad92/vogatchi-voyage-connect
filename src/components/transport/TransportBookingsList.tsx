import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Car, Calendar, MapPin, Users, DollarSign, Phone, FileText, Trash2, Send, CheckCircle } from 'lucide-react';
import { useTransportBookings } from '@/hooks/useTransportBookings';
import { useClientPagination } from '@/hooks/useClientPagination';
import PaginationControlsUI from '@/components/ui/pagination-controls';
import UnifiedBookingStatusSelector from '@/components/common/UnifiedBookingStatusSelector';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';
import EmptyState from '@/components/ui/empty-state';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { SupportedCurrency } from '@/types/currency';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TransportBookingsList = () => {
  const navigate = useNavigate();
  const {
    transportBookings,
    bookingsLoading,
    deleteTransportBooking,
    markVoucherSent,
    markInvoiceSent,
    markSupplierPaid,
    isDeleting,
  } = useTransportBookings();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { paginatedItems, pagination } = useClientPagination(transportBookings || [], 12);

  if (bookingsLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader><div className="h-4 bg-muted rounded w-3/4" /></CardHeader>
            <CardContent><div className="space-y-2"><div className="h-3 bg-muted rounded" /><div className="h-3 bg-muted rounded w-2/3" /></div></CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!transportBookings || transportBookings.length === 0) {
    return (
      <EmptyState
        icon={Car}
        title="لا توجد حجوزات نقل"
        description="ابدأ بإضافة أول حجز نقل لتتبع رحلاتك الداخلية"
        actionLabel="إضافة حجز جديد"
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedItems.map((booking) => (
          <Card key={booking.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  {booking.booking_reference}
                </CardTitle>
                <UnifiedBookingStatusSelector
                  bookingId={booking.id}
                  bookingType="transport"
                  currentStatus={booking.status ? {
                    id: '',
                    name: booking.status.name,
                    name_ar: booking.status.name_ar,
                    color: booking.status.color
                  } : undefined}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {booking.customer_name}
                {booking.customer_id && (
                  <Button variant="link" size="sm" className="p-0 h-auto mr-2" onClick={() => navigate(`/customers/${booking.customer_id}`)}>
                    عرض الملف
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(booking.departure_date), 'PPP', { locale: ar })}
                    {booking.departure_time && ` - ${booking.departure_time}`}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium">من: {booking.pickup_location}</div>
                    <div>إلى: {booking.dropoff_location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{booking.number_of_passengers} راكب</span>
                </div>
              </div>

              {booking.driver_name && (
                <div className="bg-muted p-3 rounded-lg">
                  <div className="text-sm font-medium">السائق: {booking.driver_name}</div>
                  {booking.driver_phone && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {booking.driver_phone}
                    </div>
                  )}
                  {booking.vehicle_plate_number && (
                    <div className="text-sm text-muted-foreground">لوحة: {booking.vehicle_plate_number}</div>
                  )}
                </div>
              )}

              <div className="border-t pt-3">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>التكلفة الإجمالية:</span>
                  <span className="font-bold text-green-600">
                    <MultiCurrencyDisplay amount={booking.total_cost} currency={booking.currency as SupportedCurrency} />
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>المبلغ المدفوع:</span>
                  <span className="text-primary">
                    <MultiCurrencyDisplay amount={booking.paid_amount} currency={booking.currency as SupportedCurrency} />
                  </span>
                </div>
                {booking.remaining_amount && booking.remaining_amount > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span>المبلغ المتبقي:</span>
                    <span className="text-destructive font-medium">
                      <MultiCurrencyDisplay amount={booking.remaining_amount} currency={booking.currency as SupportedCurrency} />
                    </span>
                  </div>
                )}
              </div>

              <div className="text-sm">
                <span className="text-muted-foreground">المورد: </span>
                <span className="font-medium">{booking.supplier_name}</span>
              </div>

              {/* Document status badges with actions */}
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge
                  variant={booking.invoice_sent ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => !booking.invoice_sent && markInvoiceSent(booking.id)}
                >
                  {booking.invoice_sent ? <CheckCircle className="h-3 w-3 ml-1" /> : null}
                  فاتورة {booking.invoice_sent ? "✓" : "✗"}
                </Badge>
                <Badge
                  variant={booking.voucher_sent ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => !booking.voucher_sent && markVoucherSent(booking.id)}
                >
                  {booking.voucher_sent ? <CheckCircle className="h-3 w-3 ml-1" /> : null}
                  قسيمة {booking.voucher_sent ? "✓" : "✗"}
                </Badge>
                <Badge
                  variant={booking.supplier_payment_sent ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => !booking.supplier_payment_sent && markSupplierPaid(booking.id)}
                >
                  {booking.supplier_payment_sent ? <CheckCircle className="h-3 w-3 ml-1" /> : null}
                  دفع مورد {booking.supplier_payment_sent ? "✓" : "✗"}
                </Badge>
              </div>

              {booking.special_requests && (
                <div className="text-sm bg-accent/50 p-2 rounded">
                  <div className="font-medium">طلبات خاصة:</div>
                  <div className="text-muted-foreground">{booking.special_requests}</div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1"
                  onClick={() => navigate(`/customers/${booking.customer_id}`)}>
                  <FileText className="h-4 w-4 ml-1" />
                  تفاصيل
                </Button>
                <Button size="sm" variant="outline"
                  onClick={() => !booking.invoice_sent && markInvoiceSent(booking.id)}>
                  <DollarSign className="h-4 w-4 ml-1" />
                  فاتورة
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive"
                  onClick={() => setDeleteId(booking.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <PaginationControlsUI pagination={pagination} />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد من حذف هذا الحجز؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) deleteTransportBooking(deleteId);
                setDeleteId(null);
              }}
              className="bg-destructive text-destructive-foreground"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TransportBookingsList;
