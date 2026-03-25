import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';

import BreadcrumbNav from '@/components/ui/breadcrumb-nav';
import BookingsTable, { Booking } from '@/components/dashboard/BookingsTable';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';

const STATUS_META: Record<BookingStatus, { label: string; color: string }> = {
  confirmed: { label: '\u0645\u0624\u0643\u062f', color: '#22c55e' },
  pending: { label: '\u0645\u0639\u0644\u0642', color: '#f59e0b' },
  cancelled: { label: '\u0645\u0644\u063a\u064a', color: '#ef4444' },
  completed: { label: '\u0645\u0643\u062a\u0645\u0644', color: '#64748b' },
};

const STATUS_FILTER_OPTIONS: Array<{ value: 'all' | BookingStatus; label: string }> = [
  { value: 'all', label: '\u0643\u0644 \u0627\u0644\u062d\u0627\u0644\u0627\u062a' },
  { value: 'confirmed', label: STATUS_META.confirmed.label },
  { value: 'pending', label: STATUS_META.pending.label },
  { value: 'cancelled', label: STATUS_META.cancelled.label },
  { value: 'completed', label: STATUS_META.completed.label },
];

const buildStatus = (status: BookingStatus): Booking['booking_statuses'] => ({
  name: status,
  name_ar: STATUS_META[status].label,
  color: STATUS_META[status].color,
});

const INITIAL_BOOKINGS: Booking[] = [
  {
    id: '1',
    internal_booking_number: 'BK-001',
    customer_name: '\u0623\u062d\u0645\u062f \u0639\u0644\u064a',
    hotel_name: '\u0641\u0646\u062f\u0642 \u0627\u0644\u0646\u064a\u0644',
    check_in_date: '2026-03-10',
    total_cost_customer: 1200,
    booking_statuses: buildStatus('confirmed'),
  },
  {
    id: '2',
    internal_booking_number: 'BK-002',
    customer_name: '\u0633\u0627\u0631\u0629 \u0645\u062d\u0645\u062f',
    hotel_name: '\u0645\u0646\u062a\u062c\u0639 \u0627\u0644\u0628\u062d\u0631',
    check_in_date: '2026-03-12',
    total_cost_customer: 800,
    booking_statuses: buildStatus('pending'),
  },
  {
    id: '3',
    internal_booking_number: 'BK-003',
    customer_name: '\u0645\u062d\u0645\u062f \u0633\u0645\u064a\u0631',
    hotel_name: '\u0641\u0646\u062f\u0642 \u0627\u0644\u0623\u0647\u0631\u0627\u0645\u0627\u062a',
    check_in_date: '2026-03-15',
    total_cost_customer: 400,
    booking_statuses: buildStatus('cancelled'),
  },
  {
    id: '4',
    internal_booking_number: 'BK-004',
    customer_name: '\u0645\u0646\u0649 \u064a\u0648\u0633\u0641',
    hotel_name: '\u0623\u062c\u0646\u062d\u0629 \u0627\u0644\u0646\u062e\u064a\u0644',
    check_in_date: '2026-03-18',
    total_cost_customer: 2000,
    booking_statuses: buildStatus('completed'),
  },
];

const Bookings = () => {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | BookingStatus>('all');
  const [hotel, setHotel] = useState('');

  const [viewBooking, setViewBooking] = useState<Booking | null>(null);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);

  const filteredBookings = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    const hotelTerm = hotel.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesSearch =
        !searchTerm ||
        booking.customer_name.toLowerCase().includes(searchTerm) ||
        booking.hotel_name.toLowerCase().includes(searchTerm) ||
        booking.internal_booking_number.toLowerCase().includes(searchTerm);

      const matchesStatus = status === 'all' || booking.booking_statuses?.name === status;
      const matchesHotel = !hotelTerm || booking.hotel_name.toLowerCase().includes(hotelTerm);

      return matchesSearch && matchesStatus && matchesHotel;
    });
  }, [bookings, hotel, search, status]);

  const stats = useMemo(() => {
    const totals = bookings.reduce(
      (acc, booking) => {
        const bookingStatus = booking.booking_statuses?.name as BookingStatus | undefined;
        if (bookingStatus && acc[bookingStatus] !== undefined) {
          acc[bookingStatus] += 1;
        }

        acc.revenue += booking.total_cost_customer || 0;
        return acc;
      },
      {
        confirmed: 0,
        pending: 0,
        cancelled: 0,
        completed: 0,
        revenue: 0,
      }
    );

    return {
      total: bookings.length,
      ...totals,
    };
  }, [bookings]);

  const handleSaveEdit = () => {
    if (!editingBooking) {
      return;
    }

    setBookings((prev) => prev.map((booking) => (booking.id === editingBooking.id ? editingBooking : booking)));
    setEditingBooking(null);
    toast.success('\u062a\u0645 \u062a\u062d\u062f\u064a\u062b \u0627\u0644\u062d\u062c\u0632 \u0628\u0646\u062c\u0627\u062d');
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) {
      return;
    }

    setBookings((prev) => prev.filter((booking) => booking.id !== deleteTarget.id));
    toast.success(`\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u062d\u062c\u0632 ${deleteTarget.internal_booking_number}`);
    setDeleteTarget(null);
  };

  const clearFilters = () => {
    setSearch('');
    setStatus('all');
    setHotel('');
  };

  return (
    <div dir="rtl" className="w-full px-4 md:px-6 lg:px-8 py-6 space-y-6">
      <BreadcrumbNav
        items={[
          { label: '\u0627\u0644\u0631\u0626\u064a\u0633\u064a\u0629', href: '/dashboard' },
          { label: '\u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a' },
        ]}
      />

      <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
        <CardContent className="p-6 sm:p-7">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                {'\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a'}
              </h1>
              <p className="text-sm text-slate-600">
                {
                  '\u062a\u0627\u0628\u0639 \u0643\u0644 \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a \u0645\u0646 \u0645\u0643\u0627\u0646 \u0648\u0627\u062d\u062f \u0645\u0639 \u0623\u062f\u0648\u0627\u062a \u0639\u0631\u0636 \u0648\u062a\u0639\u062f\u064a\u0644 \u0648\u062d\u0630\u0641 \u0633\u0631\u064a\u0639\u0629.'
                }
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => navigate('/bookings-calendar')}>
                <CalendarDays className="h-4 w-4 ml-2" />
                {'\u0639\u0631\u0636 \u0627\u0644\u062a\u0642\u0648\u064a\u0645'}
              </Button>
              <Button onClick={() => navigate('/new-hotel-booking')}>
                <Plus className="h-4 w-4 ml-2" />
                {'\u062d\u062c\u0632 \u062c\u062f\u064a\u062f'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {'\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u062d\u062c\u0648\u0632\u0627\u062a'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{'\u0645\u0624\u0643\u062f'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{'\u0645\u0639\u0644\u0642'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{'\u0645\u0643\u062a\u0645\u0644'}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-slate-700">{stats.completed}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {'\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0625\u064a\u0631\u0627\u062f'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {stats.revenue.toLocaleString('ar-EG')} {'\u062c.\u0645'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            {'\u0627\u0644\u0641\u0644\u0627\u062a\u0631'}
          </div>

          <div className="grid gap-3 lg:grid-cols-12">
            <div className="lg:col-span-5 relative">
              <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={'\u0627\u0628\u062d\u062b \u0628\u0627\u0644\u0645\u0631\u062c\u0639 \u0623\u0648 \u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064a\u0644 \u0623\u0648 \u0627\u0644\u0641\u0646\u062f\u0642'}
                className="pr-9"
              />
            </div>

            <div className="lg:col-span-3">
              <Input
                value={hotel}
                onChange={(event) => setHotel(event.target.value)}
                placeholder={'\u0627\u0633\u0645 \u0627\u0644\u0641\u0646\u062f\u0642'}
              />
            </div>

            <div className="lg:col-span-2">
              <Select value={status} onValueChange={(value) => setStatus(value as 'all' | BookingStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder={'\u0627\u0644\u062d\u0627\u0644\u0629'} />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="lg:col-span-2 flex justify-end">
              <Button variant="ghost" onClick={clearFilters} className="w-full lg:w-auto">
                {'\u0625\u0639\u0627\u062f\u0629 \u062a\u0639\u064a\u064a\u0646'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <BookingsTable
        bookings={filteredBookings}
        onViewBooking={setViewBooking}
        onEditBooking={setEditingBooking}
        onDeleteBooking={setDeleteTarget}
      />

      <Dialog open={Boolean(viewBooking)} onOpenChange={(open) => !open && setViewBooking(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{'\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u062d\u062c\u0632'}</DialogTitle>
            <DialogDescription>{viewBooking?.internal_booking_number}</DialogDescription>
          </DialogHeader>

          {viewBooking && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground">{'\u0627\u0644\u0639\u0645\u064a\u0644'}</p>
                  <p className="font-medium">{viewBooking.customer_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{'\u0627\u0644\u0641\u0646\u062f\u0642'}</p>
                  <p className="font-medium">{viewBooking.hotel_name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{'\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062f\u062e\u0648\u0644'}</p>
                  <p className="font-medium">{new Date(viewBooking.check_in_date).toLocaleDateString('ar-EG')}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{'\u0627\u0644\u0645\u0628\u0644\u063a'}</p>
                  <p className="font-medium">
                    {viewBooking.total_cost_customer.toLocaleString('ar-EG')} {'\u062c.\u0645'}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground mb-1">{'\u0627\u0644\u062d\u0627\u0644\u0629'}</p>
                <Badge
                  style={
                    viewBooking.booking_statuses?.color
                      ? {
                          backgroundColor: `${viewBooking.booking_statuses.color}20`,
                          borderColor: `${viewBooking.booking_statuses.color}55`,
                          color: viewBooking.booking_statuses.color,
                        }
                      : undefined
                  }
                  className="border"
                >
                  {viewBooking.booking_statuses?.name_ar ?? '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f'}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingBooking)} onOpenChange={(open) => !open && setEditingBooking(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{'\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062d\u062c\u0632'}</DialogTitle>
            <DialogDescription>
              {'\u0642\u0645 \u0628\u062a\u062d\u062f\u064a\u062b \u0628\u064a\u0627\u0646\u0627\u062a \u0627\u0644\u062d\u062c\u0632 \u062b\u0645 \u0627\u062d\u0641\u0638 \u0627\u0644\u062a\u063a\u064a\u064a\u0631\u0627\u062a.'}
            </DialogDescription>
          </DialogHeader>

          {editingBooking && (
            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label htmlFor="booking-customer">{'\u0627\u0633\u0645 \u0627\u0644\u0639\u0645\u064a\u0644'}</Label>
                <Input
                  id="booking-customer"
                  value={editingBooking.customer_name}
                  onChange={(event) =>
                    setEditingBooking((prev) =>
                      prev
                        ? {
                            ...prev,
                            customer_name: event.target.value,
                          }
                        : prev
                    )
                  }
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="booking-hotel">{'\u0627\u0633\u0645 \u0627\u0644\u0641\u0646\u062f\u0642'}</Label>
                <Input
                  id="booking-hotel"
                  value={editingBooking.hotel_name}
                  onChange={(event) =>
                    setEditingBooking((prev) =>
                      prev
                        ? {
                            ...prev,
                            hotel_name: event.target.value,
                          }
                        : prev
                    )
                  }
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="booking-date">{'\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062f\u062e\u0648\u0644'}</Label>
                  <Input
                    id="booking-date"
                    type="date"
                    value={editingBooking.check_in_date}
                    onChange={(event) =>
                      setEditingBooking((prev) =>
                        prev
                          ? {
                              ...prev,
                              check_in_date: event.target.value,
                            }
                          : prev
                      )
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="booking-amount">{'\u0627\u0644\u0645\u0628\u0644\u063a (\u062c.\u0645)'}</Label>
                  <Input
                    id="booking-amount"
                    type="number"
                    min={0}
                    step="1"
                    value={editingBooking.total_cost_customer}
                    onChange={(event) => {
                      const numericValue = Number(event.target.value);
                      setEditingBooking((prev) =>
                        prev
                          ? {
                              ...prev,
                              total_cost_customer: Number.isFinite(numericValue) ? numericValue : 0,
                            }
                          : prev
                      );
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label>{'\u0627\u0644\u062d\u0627\u0644\u0629'}</Label>
                <Select
                  value={(editingBooking.booking_statuses?.name as BookingStatus) ?? 'pending'}
                  onValueChange={(value) => {
                    const nextStatus = value as BookingStatus;
                    setEditingBooking((prev) =>
                      prev
                        ? {
                            ...prev,
                            booking_statuses: buildStatus(nextStatus),
                          }
                        : prev
                    );
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={'\u0627\u062e\u062a\u0631 \u0627\u0644\u062d\u0627\u0644\u0629'} />
                  </SelectTrigger>
                  <SelectContent>
                    {(['confirmed', 'pending', 'cancelled', 'completed'] as BookingStatus[]).map((statusValue) => (
                      <SelectItem key={statusValue} value={statusValue}>
                        {STATUS_META[statusValue].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBooking(null)}>
              {'\u0625\u0644\u063a\u0627\u0621'}
            </Button>
            <Button onClick={handleSaveEdit}>{'\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{'\u062d\u0630\u0641 \u0627\u0644\u062d\u062c\u0632\u061f'}</AlertDialogTitle>
            <AlertDialogDescription>
              {'\u0633\u064a\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u062d\u062c\u0632 \u0631\u0642\u0645'} {deleteTarget?.internal_booking_number}{' '}
              {'\u0646\u0647\u0627\u0626\u064a\u064b\u0627 \u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{'\u0625\u0644\u063a\u0627\u0621'}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {'\u062d\u0630\u0641'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Bookings;
