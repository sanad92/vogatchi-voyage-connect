
import { useNavigate } from 'react-router-dom';
import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Car, BarChart3, Calendar } from 'lucide-react';
import CarRentalsList from '@/components/transport/CarRentalsList';
import { useCarRentals } from '@/hooks/useCarRentals';
import { formatSpecializedBookingTotals } from '@/lib/specializedBookingFinance';
import { format } from 'date-fns';

const CarRentals = () => {
  const navigate = useNavigate();
  const { carRentals } = useCarRentals();

  // حساب الإحصائيات
  const totalRentals = carRentals?.length || 0;
  const active = (carRentals ?? []).filter(rental => !['cancelled', 'canceled'].includes(rental.booking_status_code ?? ''));
  const totalRevenue = formatSpecializedBookingTotals(active.map(rental => ({ amount: rental.total_rental_cost, currency: rental.currency })));
  const totalProfit = formatSpecializedBookingTotals(active.map(rental => ({ amount: rental.total_profit, currency: rental.currency })));
  const localDate = format(new Date(), 'yyyy-MM-dd');
  const activeRentals = active.filter(rental => rental.rental_start_date && rental.rental_end_date &&
    rental.rental_start_date <= localDate && rental.rental_end_date >= localDate).length;

  return (
    <div className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <BreadcrumbNav items={[
        { label: 'الرئيسية', href: '/dashboard' },
        { label: 'إيجار السيارات' }
      ]} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Car className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            إيجار السيارات
          </h1>
          <p className="text-sm text-muted-foreground">إدارة عقود إيجار السيارات والمركبات</p>
        </div>
        <Button size="sm" onClick={() => navigate("/bookings/new?type=car_rental")}>
          <Plus className="h-4 w-4 ml-2" />
          عقد إيجار جديد
        </Button>
      </div>

      {/* إحصائيات سريعة */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Car className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{totalRentals}</div>
                <div className="text-sm text-muted-foreground">إجمالي العقود</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <div className="text-lg font-bold">{totalRevenue}</div>
                <div className="text-sm text-muted-foreground">قيمة العقود</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              <div>
                <div className="text-lg font-bold">{totalProfit}</div>
                <div className="text-sm text-muted-foreground">إجمالي الأرباح</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <div className="text-2xl font-bold">{activeRentals}</div>
                <div className="text-sm text-muted-foreground">عقود نشطة</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CarRentalsList />
    </div>
  );
};

export default CarRentals;
