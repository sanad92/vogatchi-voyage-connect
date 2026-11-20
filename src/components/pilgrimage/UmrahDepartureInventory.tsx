import { BookingSalesStaffSelect } from '@/components/bookings/staff/BookingSalesStaffSelect';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import CustomerSearch from '@/components/customers/CustomerSearch';
import QuickCustomerAdd from '@/components/customers/QuickCustomerAdd';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { privateRoomTotal, type PrivateRule } from '@/lib/pilgrimage/roomPricing';
import { money, ROOM, ROOM_SIZE } from './pilgrimage-documents';

type City = 'makkah' | 'madinah';
type Room = 'quad' | 'triple' | 'double' | 'single';
type Program = {
  id: string;
  uses_room_inventory: boolean;
  currency: string;
  capacity: number;
  makkah_nights: number;
  madinah_nights: number;
  inventory_private_prices: Partial<Record<Room, PrivateRule>>;
} & Record<`price_${Room}`, number>;
type RoomStock = { city: City; room_type: Room; contracted: number; empty_rooms: number; male_beds: number; female_beds: number };
type Booking = {
  id: string;
  booking_id: string | null;
  booking_number: number;
  room_type: Room;
  mode: 'shared' | 'private';
  total_price: number;
  unified: { booking_number: string; selling_price: number; status: string } | null;
};
type Passenger = { id: string; full_name: string; status: string; inventory_booking_id?: string | null };
type Customer = { id: string; name: string; phone: string };
type Traveler = { full_name: string; gender: string };

const ROOM_TYPES: Room[] = ['quad', 'triple', 'double', 'single'];
const CITY_NAMES = { makkah: 'مكة', madinah: 'المدينة' };
const db = supabase as any;
const nativeSelect = 'h-10 w-full rounded-md border bg-background px-2 text-sm';
const newTraveler = (): Traveler => ({ full_name: '', gender: '' });
const messages: Record<string, string> = {
  umrah_inventory_existing_sales: 'تفعيل المخزون متاح لدفعة جديدة قبل تسجيل المسافرين أو إصدار عروض أو حجز المقاعد.',
  umrah_inventory_rooms_exhausted: 'رصيد الغرف في الفئة المطلوبة لا يكفي لجميع المسافرين.',
  umrah_inventory_air_seats_exhausted: 'عدد مقاعد الطيران المتاحة أقل من العدد المطلوب.',
  umrah_inventory_private_price_required: 'اعتمد سعر الغرفة الخاصة لهذه الفئة أولًا.',
  umrah_inventory_price_changed: 'السعر اتغير. راجع السعر الحالي قبل الحفظ.',
  umrah_inventory_denied: 'صلاحية المستخدم لا تسمح بهذا الإجراء.',
  umrah_unified_invoice_permission: 'إنشاء الحجز وفاتورته يحتاج صلاحية إنشاء الفواتير.',
  umrah_unified_invoice_not_created: 'تعذر إنشاء فاتورة الحجز. راجع إعدادات الحسابات قبل الحجز.',
  umrah_inventory_invalid_configuration: 'راجع المدينة وعدد الغرف والأسعار المدخلة.',
  pilgrimage_invalid_sales_employee: 'اختار موظف مبيعات نشط من شركتك.',
  pilgrimage_booking_staff_mismatch: 'الحجز محفوظ بالفعل بموظف مبيعات مختلف.',
  umrah_inventory_invalid_customer: 'اختر عميلًا مسجلًا في شركتك.',
  pilgrimage_sales_confirmation_required: 'اعتمد أسعار البرنامج وافتح التسجيل قبل الحجز.',
};

function RoomSelect({ value, onChange, id }: { value: Room; onChange: (value: Room) => void; id: string }) {
  return <select id={id} className={nativeSelect} value={value} onChange={(event) => onChange(event.target.value as Room)}>
    {ROOM_TYPES.map((room) => <option key={room} value={room}>{ROOM[room]}</option>)}
  </select>;
}

export default function UmrahDepartureInventory({
  orgId, program, passengers, canManage, canCreateCustomer, canBook, registrationOpen, openBooking, onOpenBooking, onChange,
}: {
  orgId: string; program: Program; passengers: Passenger[]; canManage: boolean; canCreateCustomer: boolean; canBook: boolean;
  registrationOpen: boolean; openBooking: boolean; onOpenBooking: (open: boolean) => void; onChange: () => void;
}) {
  const { toast } = useToast();
  const [configOpen, setConfigOpen] = useState(false);
  const [stockRoom, setStockRoom] = useState<Room>('quad');
  const [city, setCity] = useState<City>(program.makkah_nights > 0 ? 'makkah' : 'madinah');
  const [quantity, setQuantity] = useState('0');
  const [method, setMethod] = useState<'skip' | PrivateRule['method']>('skip');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [room, setRoom] = useState<Room>('quad');
  const [mode, setMode] = useState<Booking['mode']>('shared');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [salesEmployeeId, setSalesEmployeeId] = useState('');
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [travelers, setTravelers] = useState<Traveler[]>([newTraveler()]);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  const scope = { _organization_id: orgId, _program_id: program.id };
  const stock = useQuery({
    queryKey: ['umrah-room-stock', orgId, program.id],
    enabled: program.uses_room_inventory,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<RoomStock[]>('get_umrah_room_inventory', scope);
      if (error) throw error;
      return data ?? [];
    },
  });
  const bookings = useQuery<Booking[]>({
    queryKey: ['umrah-inventory-bookings', orgId, program.id],
    enabled: program.uses_room_inventory,
    queryFn: async () => {
      const { data, error } = await db.from('umrah_inventory_bookings')
        .select('id,booking_id,booking_number,room_type,mode,total_price,unified:bookings!umrah_inventory_bookings_booking_id_fkey(booking_number,selling_price,status)')
        .eq('organization_id', orgId).eq('program_id', program.id).order('booking_number', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const showError = (error: { message: string; details?: string }) => toast({
    title: 'تعذر الحفظ', variant: 'destructive', description: [
      messages[error.message] ?? error.message,
      error.message === 'umrah_inventory_rooms_exhausted' ? CITY_NAMES[error.details as City] : undefined,
    ].filter(Boolean).join(' · '),
  });
  const configure = useMutation({
    mutationFn: async () => {
      const perPerson = Object.fromEntries(Array.from({ length: ROOM_SIZE[stockRoom] }, (_, index) => {
        const count = index + 1;
        return [count, Number(prices[count])];
      }));
      const rule = method === 'fixed' ? { method, per_person: perPerson }
        : method === 'supplement' ? { method, per_empty_bed: Number(prices.supplement) } : null;
      const { error } = await callUntypedRpc('configure_umrah_room_inventory', {
        ...scope, _city: city, _room_type: stockRoom, _quantity: Number(quantity), _private_rule: rule,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setConfigOpen(false);
      onChange();
      toast({ title: 'تم تحديث رصيد الغرف وتسعيرها' });
    },
    onError: showError,
  });

  const priceRule = program.inventory_private_prices?.[room];
  const sharedPrice = Number(program[`price_${room}`]);
  const occupied = travelers.length;
  const roomSize = ROOM_SIZE[room];
  const totalPrice = mode === 'shared' ? Math.round(sharedPrice * occupied * 100) / 100
    : privateRoomTotal(priceRule, sharedPrice, occupied, roomSize);
  const availableSeats = Math.max(0, program.capacity - passengers.filter((person) => person.status !== 'cancelled').length);
  const validBooking = registrationOpen && canBook && customer && totalPrice > 0 && occupied <= availableSeats
    && (mode !== 'private' || occupied <= roomSize)
    && travelers.every((person) => person.full_name.trim().length >= 3 && ['male', 'female'].includes(person.gender));

  const book = useMutation({
    mutationFn: async () => {
      if (!validBooking || !customer) return;
      const { error } = await callUntypedRpc('create_pilgrimage_inventory_booking', {
        ...scope, _id: requestId, _customer_id: customer.id, _mode: mode,
        _room_type: room, _passengers: travelers, _expected_total: totalPrice, _sales_employee_id: salesEmployeeId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setRequestId(crypto.randomUUID());
      setTravelers([newTraveler()]);
      setCustomer(null);
      setSalesEmployeeId('');
      onOpenBooking(false);
      onChange();
      toast({ title: 'اتسجّل الحجز واتحدّث رصيد الدفعة' });
    },
    onError: (error: { message: string; details?: string; code?: string }) => {
      if (error.code) onChange();
      showError(error);
    },
  });

  const updateTravelers = (value: Traveler[]) => {
    setRequestId(crypto.randomUUID());
    setTravelers(value);
  };
  const members = new Map<string, Passenger[]>();
  for (const person of passengers) {
    if (!person.inventory_booking_id) continue;
    const group = members.get(person.inventory_booking_id) ?? [];
    group.push(person);
    members.set(person.inventory_booking_id, group);
  }

  return <div className="space-y-4">
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">رصيد الدفعة</h2>
          {program.uses_room_inventory && <p className="text-sm text-muted-foreground">مقاعد الطيران المتاحة: {availableSeats} / {program.capacity}</p>}
        </div>
        {canManage && <Button variant="outline" onClick={() => { setQuantity(program.uses_room_inventory ? '0' : '1'); setMethod('skip'); setPrices({}); setConfigOpen(true); }}>
          {program.uses_room_inventory ? 'إضافة غرف أو ضبط السعر الخاص' : 'إعداد رصيد الغرف'}
        </Button>}
      </div>
      {program.uses_room_inventory
        ? <p className="text-sm text-muted-foreground">الحجز المباشر يثبت مقاعد الطيران والتسكين من هذا الرصيد.</p>
        : <p className="text-sm text-muted-foreground">أدخل عدد الغرف المتعاقد عليها لكل مدينة وفئة قبل بدء الحجز على الرصيد.</p>}
      {stock.isLoading && <p className="text-sm">جارٍ تحميل رصيد الغرف…</p>}
      {stock.isError && <Button variant="outline" onClick={() => stock.refetch()}>تعذر تحميل رصيد الغرف. إعادة المحاولة</Button>}
      {!!stock.data?.length && <div className="overflow-x-auto"><table className="w-full text-start text-sm">
        <thead><tr className="border-b text-start">
          {['المدينة والفئة', 'المتعاقد عليها', 'غرف كاملة متاحة', 'أسرّة مفتوحة رجالي', 'أسرّة مفتوحة حريمي'].map((label) => <th key={label} scope="col" className="p-2 text-start">{label}</th>)}
        </tr></thead>
        <tbody>{stock.data.map((row) => <tr key={`${row.city}:${row.room_type}`} className="border-b">
          <th scope="row" className="p-2 text-start font-medium">{CITY_NAMES[row.city]} · {ROOM[row.room_type]}</th>
          {[row.contracted, row.empty_rooms, row.male_beds, row.female_beds].map((value, index) => <td key={index} className="p-2">{value}</td>)}
        </tr>)}</tbody>
      </table></div>}
    </Card>

    {program.uses_room_inventory && <Card className="space-y-3 p-4">
      <h2 className="font-semibold">حجوزات الرصيد</h2>
      {bookings.isLoading && <p className="text-sm">جارٍ تحميل الحجوزات…</p>}
      {bookings.isError && <Button variant="outline" onClick={() => bookings.refetch()}>تعذر تحميل الحجوزات. إعادة المحاولة</Button>}
      {bookings.isSuccess && bookings.data.length === 0 && <p className="text-sm text-muted-foreground">مافيش حجوزات على الرصيد لسه.</p>}
      {bookings.data?.map((booking) => {
        const people = members.get(booking.id) ?? [];
        return <details key={booking.id} className="rounded-md border p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            حجز {booking.unified?.booking_number ?? booking.booking_number} · {booking.mode === 'private' ? 'غرفة خاصة' : 'تسكين مشترك'} · {ROOM[booking.room_type]} · {money(booking.unified?.selling_price ?? booking.total_price, program.currency)}
            {booking.unified?.status === 'cancelled' ? ' · ملغي' : ''}
          </summary>
          {booking.booking_id && <div className="mt-2 flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm"><Link to={`/bookings/${booking.booking_id}`}>عرض الحجز الموحّد</Link></Button>
            <Button asChild variant="ghost" size="sm"><Link to={`/bookings/${booking.booking_id}?tab=financials`}>الفاتورة والتحصيل</Link></Button>
          </div>}
          <ul className="mt-2 space-y-1">{people.map((person) => <li key={person.id}>
            {person.full_name}{person.status === 'cancelled' ? ' · ملغي' : ''}
          </li>)}</ul>
        </details>;
      })}
    </Card>}

    <Dialog open={configOpen} onOpenChange={(open) => { if (!configure.isPending) setConfigOpen(open); }}>
      <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader><DialogTitle>رصيد الغرف وتسعير الغرفة الخاصة</DialogTitle>
          <DialogDescription>أضف كمية الغرف للفندق المختار أو احفظ تعرفة الإشغال الخاص للفئة. تفعيل الرصيد يخصص الدفعة للحجز المباشر من رصيدها.</DialogDescription>
        </DialogHeader>
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); configure.mutate(); }}>
          <div className="grid grid-cols-2 gap-2">
            <div><Label htmlFor="stock-city">المدينة</Label><select id="stock-city" className={nativeSelect} value={city} onChange={(event) => setCity(event.target.value as City)}>
              {program.makkah_nights > 0 && <option value="makkah">مكة</option>}
              {program.madinah_nights > 0 && <option value="madinah">المدينة</option>}
            </select></div>
            <div><Label htmlFor="stock-room">فئة الغرفة</Label><RoomSelect id="stock-room" value={stockRoom} onChange={(value) => { setStockRoom(value); setPrices({}); }} /></div>
          </div>
          <Label htmlFor="stock-quantity">عدد الغرف المراد إضافتها</Label>
          <Input id="stock-quantity" value={quantity} onChange={(event) => setQuantity(event.target.value)} type="number" min={program.uses_room_inventory ? 0 : 1} max={150} required />
          <Label htmlFor="stock-pricing">طريقة تسعير الغرفة الخاصة</Label>
          <select id="stock-pricing" className={nativeSelect} value={method} onChange={(event) => setMethod(event.target.value as typeof method)}>
            <option value="skip">اترك التعرفة الحالية</option><option value="fixed">سعر للفرد حسب الإشغال</option><option value="supplement">سعر البرنامج + فرق السرير الشاغر</option>
          </select>
          {method === 'supplement' && <div><Label htmlFor="stock-supplement">فرق كل سرير شاغر · {program.currency}</Label>
            <Input id="stock-supplement" type="number" min={0} step="0.01" required value={prices.supplement ?? ''} onChange={(event) => setPrices({ ...prices, supplement: event.target.value })} />
          </div>}
          {method === 'fixed' && Array.from({ length: ROOM_SIZE[stockRoom] }, (_, index) => index + 1).map((count) => <div key={count}>
            <Label htmlFor={`stock-rate-${count}`}>سعر الفرد عند إشغال {count} · {program.currency}</Label>
            <Input id={`stock-rate-${count}`} type="number" min="0.01" step="0.01" required value={prices[count] ?? ''} onChange={(event) => setPrices({ ...prices, [count]: event.target.value })} />
          </div>)}
          <Button type="submit" disabled={configure.isPending || (Number(quantity) === 0 && method === 'skip')}>حفظ الرصيد والتعرفة</Button>
        </form>
      </DialogContent>
    </Dialog>

    <Dialog open={openBooking} onOpenChange={(open) => { if (!book.isPending) onOpenBooking(open); }}>
      <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader><DialogTitle>حجز من رصيد الدفعة</DialogTitle>
          <DialogDescription>اختار العميل المسؤول عن الحجز وأضف أسماء المسافرين.</DialogDescription>
        </DialogHeader>
        {addingCustomer ? <QuickCustomerAdd onCustomerAdded={(record) => {
          setRequestId(crypto.randomUUID());
          setCustomer({ id: record.id, name: record.name, phone: record.phone ?? '' });
          setAddingCustomer(false);
        }} onCancel={() => setAddingCustomer(false)} /> : <CustomerSearch selectedCustomer={customer}
          onNewCustomer={canCreateCustomer ? () => setAddingCustomer(true) : undefined}
          onCustomerSelect={(value) => { setRequestId(crypto.randomUUID()); setCustomer(value); }} />}
        <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); book.mutate(); }}>
          <fieldset disabled={book.isPending} className="space-y-3">
            <BookingSalesStaffSelect value={salesEmployeeId} enabled={openBooking && canBook} onChange={value => {
              setRequestId(crypto.randomUUID());
              setSalesEmployeeId(value);
            }} />
            <div className="grid grid-cols-2 gap-2">
              <div><Label htmlFor="booking-mode">نوع التسكين</Label>
                <select id="booking-mode" className={nativeSelect} value={mode} onChange={(event) => { setRequestId(crypto.randomUUID()); setMode(event.target.value as Booking['mode']); }}>
                  <option value="shared">سرير في غرفة مشتركة</option><option value="private">غرفة خاصة بالكامل</option>
                </select>
              </div>
              <div><Label htmlFor="booking-room">فئة الغرفة</Label><RoomSelect id="booking-room" value={room} onChange={(value) => { setRequestId(crypto.randomUUID()); setRoom(value); }} /></div>
            </div>
            {travelers.map((person, index) => <div key={index} className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] items-end gap-2">
              <div><Label htmlFor={`traveler-name-${index}`}>المسافر {index + 1}</Label>
                <Input id={`traveler-name-${index}`} value={person.full_name} minLength={3} maxLength={160} required onChange={(event) => updateTravelers(travelers.map((row, ix) => ix === index ? { ...row, full_name: event.target.value } : row))} />
              </div>
              <div><Label htmlFor={`traveler-gender-${index}`}>النوع</Label>
                <select id={`traveler-gender-${index}`} className={nativeSelect} value={person.gender} required
                  onChange={(event) => updateTravelers(travelers.map((row, ix) => ix === index ? { ...row, gender: event.target.value } : row))}>
                  <option value="">اختار</option><option value="male">ذكر</option><option value="female">أنثى</option>
                </select>
              </div>
              {occupied > 1 && <Button type="button" variant="ghost" aria-label={`حذف المسافر ${index + 1}`} onClick={() => updateTravelers(travelers.filter((_, ix) => ix !== index))}>حذف</Button>}
            </div>)}
            <Button type="button" variant="outline" disabled={occupied >= Math.min(availableSeats, mode === 'private' ? roomSize : 45)} onClick={() => updateTravelers([...travelers, newTraveler()])}>إضافة مسافر</Button>
          </fieldset>
          <p className="text-sm font-medium" role="status">{totalPrice > 0 ? `الإجمالي: ${money(totalPrice, program.currency)} · مقاعد الطيران: ${occupied}` : 'السعر غير معتمد لهذا الاختيار.'}</p>
          {occupied > availableSeats && <p className="text-sm text-destructive">مقاعد الطيران المتاحة أقل من العدد المطلوب.</p>}
          {mode === 'private' && occupied > roomSize && <p className="text-sm text-destructive">عدد المسافرين أكبر من سعة الغرفة الخاصة.</p>}
          <Button type="submit" disabled={book.isPending || !validBooking}>تأكيد الحجز</Button>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
