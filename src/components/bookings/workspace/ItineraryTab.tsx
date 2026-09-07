import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Hotel, Plane, Car, Truck, Plus, Pencil } from 'lucide-react';
import { ItineraryItemDialog, type ItineraryKind } from './ItineraryItemDialog';
import type { Workspace } from './types';

interface Props {
  workspace: Workspace;
}

export const ItineraryTab = ({ workspace }: Props) => {
  const it = workspace.itinerary;
  const booking = (workspace as any).booking;
  const bookingId: string | undefined = booking?.id;
  const [openKind, setOpenKind] = useState<ItineraryKind | null>(null);

  const sections: Array<{
    kind: ItineraryKind;
    title: string;
    icon: React.ReactNode;
    empty: string;
    data: any;
    labels: Record<string, string>;
  }> = [
    {
      kind: 'hotel',
      title: 'الفندق',
      icon: <Hotel className="h-4 w-4" />,
      empty: 'لا توجد تفاصيل فندق',
      data: it?.hotel,
      labels: {
        hotel_name: 'اسم الفندق',
        city: 'المدينة',
        room_type: 'نوع الغرفة',
        board_type: 'الإقامة',
        check_in: 'دخول',
        check_out: 'خروج',
        nights: 'الليالي',
        rooms: 'الغرف',
      },
    },
    {
      kind: 'flight',
      title: 'الطيران',
      icon: <Plane className="h-4 w-4" />,
      empty: 'لا توجد تفاصيل طيران',
      data: it?.flight,
      labels: {
        airline: 'شركة الطيران',
        flight_number: 'رقم الرحلة',
        departure_airport: 'المغادرة',
        arrival_airport: 'الوصول',
        departure_date: 'التاريخ',
        departure_time: 'الوقت',
        pnr: 'PNR',
        ticket_number: 'رقم التذكرة',
      },
    },
    {
      kind: 'transport',
      title: 'النقل',
      icon: <Truck className="h-4 w-4" />,
      empty: 'لا يوجد نقل',
      data: it?.transport,
      labels: {
        vehicle_type: 'المركبة',
        route: 'المسار',
        pickup_point: 'الالتقاط',
        dropoff_point: 'التوصيل',
        passengers: 'الركاب',
      },
    },
    {
      kind: 'car',
      title: 'تأجير سيارة',
      icon: <Car className="h-4 w-4" />,
      empty: 'لا يوجد تأجير',
      data: it?.car,
      labels: {
        car_type: 'نوع السيارة',
        pickup_location: 'الاستلام',
        dropoff_location: 'التسليم',
        pickup_date: 'من',
        dropoff_date: 'إلى',
        daily_rate: 'السعر اليومي',
      },
    },
  ];

  const activeSection = sections.find((s) => s.kind === openKind);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <SubCard
            key={s.kind}
            title={s.title}
            icon={s.icon}
            empty={s.empty}
            data={s.data}
            labels={s.labels}
            disabled={!bookingId}
            onOpen={() => setOpenKind(s.kind)}
          />
        ))}
      </div>

      {bookingId && activeSection && (
        <ItineraryItemDialog
          open={!!openKind}
          onOpenChange={(o) => !o && setOpenKind(null)}
          kind={activeSection.kind}
          bookingId={bookingId}
          booking={booking}
          existing={activeSection.data}
          onSaved={() => workspace.refetch()}
        />
      )}
    </>
  );
};

const SubCard = ({
  title,
  icon,
  data,
  labels,
  empty,
  onOpen,
  disabled,
}: {
  title: string;
  icon: React.ReactNode;
  data: any;
  labels: Record<string, string>;
  empty: string;
  onOpen: () => void;
  disabled?: boolean;
}) => (
  <Card>
    <CardHeader className="flex-row items-center justify-between">
      <CardTitle className="flex items-center gap-2 text-base">
        {icon}
        {title}
      </CardTitle>
      <Button size="sm" variant="ghost" onClick={onOpen} disabled={disabled}>
        {data ? (
          <>
            <Pencil className="h-4 w-4 ml-1" /> تعديل
          </>
        ) : (
          <>
            <Plus className="h-4 w-4 ml-1" /> إضافة
          </>
        )}
      </Button>
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
