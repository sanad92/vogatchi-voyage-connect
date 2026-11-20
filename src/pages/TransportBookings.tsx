import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Car, BarChart3 } from 'lucide-react';
import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import TransportBookingsList from '@/components/transport/TransportBookingsList';
import { useTransportBookings } from '@/hooks/useTransportBookings';
import { formatSpecializedBookingTotals } from '@/lib/specializedBookingFinance';

const TransportBookings = () => {
  const { transportBookings } = useTransportBookings();
  const navigate = useNavigate();

  const totalBookings = transportBookings?.length || 0;
  const active = (transportBookings ?? []).filter(booking => !['cancelled', 'canceled'].includes(booking.booking_status_code ?? ''));
  const totalRevenue = formatSpecializedBookingTotals(active.map(booking => ({ amount: booking.total_cost, currency: booking.currency })));
  const totalProfit = formatSpecializedBookingTotals(active.map(booking => ({ amount: booking.total_profit, currency: booking.currency })));
  const visibleInvoiceStatuses = active.filter(booking => booking.invoice_document_status != null);
  const missingInvoice = visibleInvoiceStatuses.filter(booking => booking.invoice_document_status === 'missing').length;

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <BreadcrumbNav items={[
        { label: 'الرئيسية', href: '/dashboard' },
        { label: 'حجوزات النقل' }
      ]} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            حجوزات النقل والرحلات الداخلية
          </h1>
          <p className="text-sm text-muted-foreground">إدارة حجوزات النقل والانتقالات</p>
        </div>
        <Button size="sm" onClick={() => navigate("/bookings/new?type=transport")}>
          <Plus className="h-4 w-4 ml-2" />
          حجز جديد
        </Button>
      </div>

      {/* إحصائيات */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{totalBookings}</div>
                <div className="text-sm text-muted-foreground">إجمالي الحجوزات</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-green-600" />
              <div>
                <div className="text-lg font-bold">{totalRevenue}</div>
                <div className="text-sm text-muted-foreground">قيمة الحجوزات</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div>
                <div className="text-lg font-bold">{totalProfit}</div>
                <div className="text-sm text-muted-foreground">إجمالي الأرباح</div>
              </div>
            </div>
          </CardContent>
        </Card>
        {visibleInvoiceStatuses.length > 0 && <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold">{missingInvoice}</div>
                <div className="text-sm text-muted-foreground">من غير فاتورة مسجلة</div>
              </div>
            </div>
          </CardContent>
        </Card>}
      </div>

      <TransportBookingsList />
    </div>
  );
};

export default TransportBookings;
