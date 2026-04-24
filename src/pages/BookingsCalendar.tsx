import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useOrgId } from '@/hooks/useOrgId';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  Calendar as CalendarIcon, Hotel, Plane, Car, Bus, ChevronRight, ChevronLeft,
  Plus, Download, Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewMode = 'month' | 'week' | 'day';
type BookingType = 'hotel' | 'flight' | 'car' | 'transport';

interface CalendarBooking {
  id: string;
  type: BookingType;
  customerName: string;
  title: string;
  startDate: string;
  endDate: string;
  amount: number;
  paid: number;
  href: string;
}

const TYPE_META: Record<BookingType, { label: string; icon: any; bar: string; dot: string }> = {
  hotel:     { label: 'فندق',  icon: Hotel, bar: 'bg-sky-100 border-sky-400 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-700',                 dot: 'bg-sky-500' },
  flight:    { label: 'طيران', icon: Plane, bar: 'bg-violet-100 border-violet-400 text-violet-900 dark:bg-violet-950/40 dark:text-violet-200 dark:border-violet-700', dot: 'bg-violet-500' },
  car:       { label: 'سيارة', icon: Car,   bar: 'bg-emerald-100 border-emerald-400 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700', dot: 'bg-emerald-500' },
  transport: { label: 'نقل',   icon: Bus,   bar: 'bg-amber-100 border-amber-400 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700',     dot: 'bg-amber-500' },
};

// RTL day order: Saturday first
const DAY_NAMES = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// JS getDay(): 0=Sun..6=Sat → our index: 0=Sat..6=Fri
const dayIndexFromJS = (jsDay: number) => (jsDay + 1) % 7;

const BookingsCalendar = () => {
  const navigate = useNavigate();
  const orgId = useOrgId();
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<ViewMode>('month');
  const [enabledTypes, setEnabledTypes] = useState<Set<BookingType>>(
    new Set(['hotel', 'flight', 'car', 'transport'])
  );
  const [unpaidOnly, setUnpaidOnly] = useState(false);

  // Fetch a 3-month window for smooth navigation
  const range = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    const end = new Date(cursor.getFullYear(), cursor.getMonth() + 2, 0);
    return { start: toISO(start), end: toISO(end) };
  }, [cursor]);

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings-calendar', orgId, range.start, range.end],
    enabled: !!orgId,
    queryFn: async (): Promise<CalendarBooking[]> => {
      const [hotelsRes, flightsRes, carsRes, transportRes] = await Promise.all([
        supabase.from('hotel_bookings')
          .select('id, customer_name, hotel_name, check_in_date, check_out_date, total_cost_customer, paid_amount')
          .eq('organization_id', orgId!)
          .gte('check_in_date', range.start)
          .lte('check_in_date', range.end),
        supabase.from('flight_bookings')
          .select('id, customer_name, flight_number, departure_date, total_cost_egp, paid_amount')
          .eq('organization_id', orgId!)
          .gte('departure_date', range.start)
          .lte('departure_date', range.end),
        supabase.from('car_rentals')
          .select('id, customer_name, vehicle_plate_number, rental_start_date, rental_end_date, total_cost_egp, total_rental_cost, paid_amount')
          .eq('organization_id', orgId!)
          .gte('rental_start_date', range.start)
          .lte('rental_start_date', range.end),
        supabase.from('transport_bookings')
          .select('id, customer_name, pickup_location, dropoff_location, departure_date, total_cost_egp, total_cost, paid_amount')
          .eq('organization_id', orgId!)
          .gte('departure_date', range.start)
          .lte('departure_date', range.end),
      ]);

      const out: CalendarBooking[] = [];

      (hotelsRes.data || []).forEach((b: any) => out.push({
        id: b.id, type: 'hotel', customerName: b.customer_name || '—',
        title: b.hotel_name || 'فندق',
        startDate: b.check_in_date,
        endDate: b.check_out_date || b.check_in_date,
        amount: Number(b.total_cost_customer || 0),
        paid: Number(b.paid_amount || 0),
        href: '/hotel-bookings',
      }));
      (flightsRes.data || []).forEach((b: any) => out.push({
        id: b.id, type: 'flight', customerName: b.customer_name || '—',
        title: b.flight_number || 'رحلة طيران',
        startDate: b.departure_date, endDate: b.departure_date,
        amount: Number(b.total_cost_egp || 0),
        paid: Number(b.paid_amount || 0),
        href: '/flight-bookings',
      }));
      (carsRes.data || []).forEach((b: any) => out.push({
        id: b.id, type: 'car', customerName: b.customer_name || '—',
        title: b.vehicle_plate_number || 'تأجير سيارة',
        startDate: b.rental_start_date,
        endDate: b.rental_end_date || b.rental_start_date,
        amount: Number(b.total_cost_egp || b.total_rental_cost || 0),
        paid: Number(b.paid_amount || 0),
        href: '/car-rentals',
      }));
      (transportRes.data || []).forEach((b: any) => out.push({
        id: b.id, type: 'transport', customerName: b.customer_name || '—',
        title: [b.pickup_location, b.dropoff_location].filter(Boolean).join(' → ') || 'نقل',
        startDate: b.departure_date, endDate: b.departure_date,
        amount: Number(b.total_cost_egp || b.total_cost || 0),
        paid: Number(b.paid_amount || 0),
        href: '/transport-bookings',
      }));

      return out;
    },
  });

  const filtered = useMemo(
    () => bookings.filter(b => {
      if (!enabledTypes.has(b.type)) return false;
      if (unpaidOnly && b.paid >= b.amount) return false;
      return true;
    }),
    [bookings, enabledTypes, unpaidOnly]
  );

  const monthStats = useMemo(() => {
    const m = cursor.getMonth(), y = cursor.getFullYear();
    const inMonth = filtered.filter(b => {
      const d = new Date(b.startDate);
      return d.getMonth() === m && d.getFullYear() === y;
    });
    const totalAmount = inMonth.reduce((s, b) => s + b.amount, 0);
    const unpaidCount = inMonth.filter(b => b.paid < b.amount).length;
    return { count: inMonth.length, totalAmount, unpaidCount };
  }, [filtered, cursor]);

  const monthGrid = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const leading = dayIndexFromJS(firstDay.getDay());
    const cells: Array<{ date: Date | null; iso: string | null }> = [];
    for (let i = 0; i < leading; i++) cells.push({ date: null, iso: null });
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(y, m, d);
      cells.push({ date, iso: toISO(date) });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, iso: null });
    return cells;
  }, [cursor]);

  const weekGrid = useMemo(() => {
    const start = new Date(cursor);
    start.setDate(start.getDate() - dayIndexFromJS(start.getDay()));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [cursor]);

  const bookingsForDate = (iso: string) =>
    filtered.filter(b => iso >= b.startDate && iso <= b.endDate);

  const goPrev = () => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() - 1);
    else if (view === 'week') d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCursor(d);
  };
  const goNext = () => {
    const d = new Date(cursor);
    if (view === 'month') d.setMonth(d.getMonth() + 1);
    else if (view === 'week') d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCursor(d);
  };

  const todayISO = toISO(new Date());

  const exportICS = () => {
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0',
      'PRODID:-//Vogantra//Bookings Calendar//AR', 'CALSCALE:GREGORIAN',
    ];
    filtered.forEach(b => {
      const start = b.startDate.replace(/-/g, '');
      const endD = new Date(b.endDate);
      endD.setDate(endD.getDate() + 1);
      const end = toISO(endD).replace(/-/g, '');
      lines.push(
        'BEGIN:VEVENT',
        `UID:${b.id}@vogantra`,
        `DTSTART;VALUE=DATE:${start}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:[${TYPE_META[b.type].label}] ${b.customerName} — ${b.title}`,
        `DESCRIPTION:المبلغ: ${b.amount} ج.م — مدفوع: ${b.paid} ج.م`,
        'END:VEVENT'
      );
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vogantra-bookings-${toISO(cursor)}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const headerLabel =
    view === 'month'
      ? `${MONTH_NAMES[cursor.getMonth()]} ${cursor.getFullYear()}`
      : view === 'week'
        ? `${weekGrid[0].getDate()} ${MONTH_NAMES[weekGrid[0].getMonth()]} – ${weekGrid[6].getDate()} ${MONTH_NAMES[weekGrid[6].getMonth()]}`
        : cursor.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const newBookingItems = [
    { label: 'حجز فندق', href: '/new-hotel-booking', icon: Hotel },
    { label: 'حجز طيران', href: '/new-flight-booking', icon: Plane },
    { label: 'تأجير سيارة', href: '/car-rentals', icon: Car },
    { label: 'حجز نقل', href: '/transport-bookings', icon: Bus },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="p-4 lg:p-8 max-w-[1600px] mx-auto space-y-5" dir="rtl">
        {/* Header */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-[28px] font-bold text-foreground tracking-tight flex items-center gap-2">
                <CalendarIcon className="h-6 w-6 text-primary" /> تقويم الحجوزات
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {monthStats.count} حجز هذا الشهر • {monthStats.totalAmount.toLocaleString()} ج.م
                {monthStats.unpaidCount > 0 && (
                  <span className="text-amber-600 font-medium"> • {monthStats.unpaidCount} غير مكتمل الدفع</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportICS} className="gap-1.5">
                <Download className="h-4 w-4" />
                تصدير ICS
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    حجز جديد
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {newBookingItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <DropdownMenuItem key={item.href} onClick={() => navigate(item.href)} className="gap-2">
                        <Icon className="h-4 w-4" /> {item.label}
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Controls bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card rounded-2xl border border-border/60 p-3">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goPrev}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setCursor(new Date())} className="h-8 px-3">
                اليوم
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goNext}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold text-foreground mr-2">{headerLabel}</span>
            </div>

            <div className="inline-flex bg-muted rounded-xl p-1">
              {(['month', 'week', 'day'] as ViewMode[]).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-lg transition-colors',
                    view === v ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {v === 'month' ? 'شهر' : v === 'week' ? 'أسبوع' : 'يوم'}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              {(Object.keys(TYPE_META) as BookingType[]).map(t => {
                const active = enabledTypes.has(t);
                const Icon = TYPE_META[t].icon;
                return (
                  <button
                    key={t}
                    onClick={() => {
                      const next = new Set(enabledTypes);
                      next.has(t) ? next.delete(t) : next.add(t);
                      setEnabledTypes(next);
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                      active ? TYPE_META[t].bar : 'bg-muted text-muted-foreground border-transparent opacity-60 hover:opacity-100'
                    )}
                  >
                    <span className={cn('h-1.5 w-1.5 rounded-full', TYPE_META[t].dot)} />
                    <Icon className="h-3 w-3" />
                    {TYPE_META[t].label}
                  </button>
                );
              })}
              <button
                onClick={() => setUnpaidOnly(!unpaidOnly)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
                  unpaidOnly
                    ? 'bg-rose-100 text-rose-900 border-rose-400 dark:bg-rose-950/40 dark:text-rose-200'
                    : 'bg-muted text-muted-foreground border-transparent opacity-60 hover:opacity-100'
                )}
              >
                غير مدفوع فقط
              </button>
            </div>
          </div>
        </div>

        {/* Calendar body */}
        <Card className="border-border/60 shadow-none rounded-2xl overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">جاري تحميل التقويم…</div>
          ) : view === 'month' ? (
            <>
              <div className="grid grid-cols-7 border-b border-border/60 bg-muted/40">
                {DAY_NAMES.map(d => (
                  <div key={d} className="px-2 py-2.5 text-center text-xs font-semibold text-muted-foreground">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {monthGrid.map((cell, idx) => {
                  if (!cell.iso) {
                    return <div key={idx} className="min-h-[110px] border-b border-l border-border/40 bg-muted/20" />;
                  }
                  const day = cell.date!.getDate();
                  const isToday = cell.iso === todayISO;
                  const dayBookings = bookingsForDate(cell.iso);
                  return (
                    <div
                      key={idx}
                      className="min-h-[110px] border-b border-l border-border/40 p-1.5 hover:bg-muted/30 transition-colors flex flex-col gap-1"
                    >
                      <div className="flex justify-end">
                        <span
                          className={cn(
                            'inline-flex items-center justify-center text-xs font-semibold w-6 h-6 rounded-full',
                            isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                          )}
                        >
                          {day}
                        </span>
                      </div>
                      <div className="space-y-1 overflow-hidden">
                        {dayBookings.slice(0, 3).map(b => (
                          <BookingChip
                            key={b.id + cell.iso}
                            booking={b}
                            dayISO={cell.iso!}
                            onClick={() => navigate(b.href)}
                          />
                        ))}
                        {dayBookings.length > 3 && (
                          <div className="text-[10px] text-muted-foreground font-medium px-1">
                            +{dayBookings.length - 3} المزيد
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : view === 'week' ? (
            <div className="grid grid-cols-7">
              {weekGrid.map(d => {
                const iso = toISO(d);
                const isToday = iso === todayISO;
                const dayBookings = bookingsForDate(iso);
                return (
                  <div key={iso} className="border-l border-border/40 last:border-l-0 min-h-[400px]">
                    <div
                      className={cn(
                        'px-3 py-2 border-b border-border/40 bg-muted/40 text-center',
                        isToday && 'bg-primary/10'
                      )}
                    >
                      <div className="text-[11px] font-medium text-muted-foreground">
                        {DAY_NAMES[dayIndexFromJS(d.getDay())]}
                      </div>
                      <div
                        className={cn(
                          'mt-0.5 inline-flex items-center justify-center text-sm font-bold w-7 h-7 rounded-full',
                          isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                        )}
                      >
                        {d.getDate()}
                      </div>
                    </div>
                    <div className="p-2 space-y-1.5">
                      {dayBookings.length === 0 && (
                        <div className="text-[11px] text-muted-foreground text-center pt-4">لا توجد حجوزات</div>
                      )}
                      {dayBookings.map(b => (
                        <BookingChip
                          key={b.id + iso}
                          booking={b}
                          dayISO={iso}
                          expanded
                          onClick={() => navigate(b.href)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4">
              <div className="text-center mb-4">
                <div className="text-xs text-muted-foreground">{DAY_NAMES[dayIndexFromJS(cursor.getDay())]}</div>
                <div className="text-2xl font-bold text-foreground">
                  {cursor.getDate()} {MONTH_NAMES[cursor.getMonth()]}
                </div>
              </div>
              <div className="space-y-2 max-w-2xl mx-auto">
                {bookingsForDate(toISO(cursor)).length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">لا توجد حجوزات في هذا اليوم</div>
                ) : (
                  bookingsForDate(toISO(cursor)).map(b => (
                    <BookingChip
                      key={b.id}
                      booking={b}
                      dayISO={toISO(cursor)}
                      expanded
                      large
                      onClick={() => navigate(b.href)}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </TooltipProvider>
  );
};

const BookingChip = ({
  booking, dayISO, expanded, large, onClick,
}: {
  booking: CalendarBooking;
  dayISO: string;
  expanded?: boolean;
  large?: boolean;
  onClick: () => void;
}) => {
  const meta = TYPE_META[booking.type];
  const Icon = meta.icon;
  const isUnpaid = booking.paid < booking.amount;
  const isStart = booking.startDate === dayISO;
  const isEnd = booking.endDate === dayISO;
  const isMultiDay = booking.startDate !== booking.endDate;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'w-full text-right border flex items-center gap-1.5 transition-all hover:shadow-sm cursor-pointer',
            meta.bar,
            isUnpaid && 'ring-1 ring-rose-400/70',
            large
              ? 'rounded-xl px-4 py-3 text-sm'
              : expanded
                ? 'rounded-lg px-2 py-1.5 text-xs'
                : 'rounded px-1.5 py-0.5 text-[10px]',
            isMultiDay && !isStart && 'rounded-r-none border-r-0',
            isMultiDay && !isEnd && 'rounded-l-none border-l-0',
          )}
        >
          <Icon className={cn(large ? 'h-4 w-4' : 'h-3 w-3', 'flex-shrink-0')} />
          <span className="truncate flex-1 font-medium">{booking.customerName}</span>
          {large && (
            <span className="text-xs opacity-75 flex-shrink-0">
              {booking.amount.toLocaleString()} ج.م
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1 text-xs" dir="rtl">
          <div className="font-semibold flex items-center gap-1.5">
            <Icon className="h-3.5 w-3.5" /> {meta.label}
          </div>
          <div><span className="text-muted-foreground">العميل:</span> {booking.customerName}</div>
          <div><span className="text-muted-foreground">التفاصيل:</span> {booking.title}</div>
          <div><span className="text-muted-foreground">المبلغ:</span> {booking.amount.toLocaleString()} ج.م</div>
          <div>
            <span className="text-muted-foreground">المدفوع:</span> {booking.paid.toLocaleString()} ج.م
            {isUnpaid && (
              <span className="text-rose-500 font-semibold">
                {' '}(متبقي {(booking.amount - booking.paid).toLocaleString()})
              </span>
            )}
          </div>
          {isMultiDay && (
            <div className="text-muted-foreground">
              {booking.startDate} ← {booking.endDate}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

export default BookingsCalendar;
