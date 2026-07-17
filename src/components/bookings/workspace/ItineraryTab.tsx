import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hotel, Plane, Car, Truck, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Workspace } from './types';

interface Props {
  workspace: Workspace;
}

export const ItineraryTab = ({ workspace }: Props) => {
  const navigate = useNavigate();
  const it = workspace.itinerary;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SubCard
        title="الفندق"
        icon={<Hotel className="h-4 w-4" />}
        empty="لا توجد تفاصيل فندق"
        onAdd={() => navigate('/hotels/new')}
        data={it?.hotel}
        labels={{
          hotel_name: 'اسم الفندق',
          room_type: 'نوع الغرفة',
          board_type: 'الإقامة',
          check_in: 'دخول',
          check_out: 'خروج',
          nights: 'الليالي',
          rooms: 'الغرف',
        }}
      />
      <SubCard
        title="الطيران"
        icon={<Plane className="h-4 w-4" />}
        empty="لا توجد تفاصيل طيران"
        onAdd={() => navigate('/flights/new')}
        data={it?.flight}
        labels={{
          airline: 'شركة الطيران',
          flight_number: 'رقم الرحلة',
          departure_airport: 'المغادرة',
          arrival_airport: 'الوصول',
          departure_date: 'التاريخ',
          departure_time: 'الوقت',
          pnr: 'PNR',
          ticket_number: 'رقم التذكرة',
        }}
      />
      <SubCard
        title="النقل"
        icon={<Truck className="h-4 w-4" />}
        empty="لا يوجد نقل"
        onAdd={() => navigate('/transport/new')}
        data={it?.transport}
        labels={{
          vehicle_type: 'المركبة',
          route: 'المسار',
          pickup_point: 'الالتقاط',
          dropoff_point: 'التوصيل',
          passengers: 'الركاب',
        }}
      />
      <SubCard
        title="تأجير سيارة"
        icon={<Car className="h-4 w-4" />}
        empty="لا يوجد تأجير"
        onAdd={() => navigate('/car-rentals')}
        data={it?.car}
        labels={{
          car_type: 'نوع السيارة',
          pickup_location: 'الاستلام',
          dropoff_location: 'التسليم',
          pickup_date: 'من',
          dropoff_date: 'إلى',
          daily_rate: 'السعر اليومي',
        }}
      />
    </div>
  );
};

const SubCard = ({
  title,
  icon,
  data,
  labels,
  empty,
  onAdd,
}: {
  title: string;
  icon: React.ReactNode;
  data: any;
  labels: Record<string, string>;
  empty: string;
  onAdd: () => void;
}) => (
  <Card>
    <CardHeader className="flex-row items-center justify-between">
      <CardTitle className="flex items-center gap-2 text-base">
        {icon}
        {title}
      </CardTitle>
      {!data && (
        <Button size="sm" variant="ghost" onClick={onAdd}>
          <Plus className="h-4 w-4 ml-1" /> إضافة
        </Button>
      )}
    </CardHeader>
    <CardContent className="text-sm">
      {data ? (
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(labels).map(([k, label]) =>
            data[k] != null && data[k] !== '' ? (
              <div key={k} className="flex justify-between gap-2">
                <span className="text-muted-foreground text-xs">{label}</span>
                <span className="font-medium truncate">{String(data[k])}</span>
              </div>
            ) : null,
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">{empty}</p>
      )}
    </CardContent>
  </Card>
);
