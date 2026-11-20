import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { privateRoomTotal, type PrivateRule } from '@/lib/pilgrimage/roomPricing';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import { money, ROOM, ROOM_SIZE } from './pilgrimage-documents';

type Room = 'quad' | 'triple' | 'double' | 'single';
type Program = {
  id: string;
  name: string;
  status: string;
  currency: string;
  departure_date: string | null;
  inventory_private_prices?: Partial<Record<Room, PrivateRule>>;
} & Record<`price_${Room}`, number>;
type Passenger = {
  id: string;
  full_name: string;
  status: string;
  room_type: Room;
  total_price: number;
  inventory_room_mode?: string;
  unified_booking_id?: string | null;
};
type Preview = {
  customer: { blocked_reason: string | null; invoices: { paid: number; due: number }[] };
  suppliers: unknown[];
};
type Request = {
  _organization_id: string;
  _booking_id: string;
  _id: string;
  _target_program_id: string;
  _room_type: Room;
  _expected_total: number;
  _reason: string;
};

const errors: Record<string, string> = {
  pilgrimage_private_group_finance_review_required: 'الحجز الحالي عليه حركة مالية محتاجة مراجعة قبل النقل.',
  pilgrimage_private_group_roster_changed: 'قائمة المسافرين أو سعر الحجز اتغير. حدّث البيانات وراجع الطلب.',
  pilgrimage_transfer_program_unavailable: 'الدفعة البديلة أو الفئة المختارة غير متاحة.',
  umrah_inventory_air_seats_exhausted: 'عدد مقاعد الطيران المتاحة لا يكفي كل المسافرين.',
  umrah_inventory_rooms_exhausted: 'مفيش غرفة خاصة متاحة في كل المدن المطلوبة.',
  umrah_inventory_price_changed: 'تعرفة الغرفة البديلة اتغيرت. راجع السعر وحاول تاني.',
};

export default function PilgrimagePrivateGroupAmendment({ orgId, program, targets, passengers, onChanged }: {
  orgId: string;
  program: Program;
  targets: Program[];
  passengers: Passenger[];
  onChanged: (bookingId: string) => void;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [bookingId, setBookingId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [room, setRoom] = useState<Room>();
  const [reason, setReason] = useState('');
  const [approved, setApproved] = useState(false);
  const [submitted, setSubmitted] = useState<Request | null>(null);
  const groups = new Map<string, Passenger[]>();
  for (const person of passengers) {
    if (person.inventory_room_mode === 'private' && person.unified_booking_id) {
      const group = groups.get(person.unified_booking_id) ?? [];
      group.push(person);
      groups.set(person.unified_booking_id, group);
    }
  }
  const eligible = Array.from(groups).filter(([, group]) =>
    group.every(({ status }) => !['cancelled', 'traveled', 'completed'].includes(status)));
  const original = groups.get(bookingId) ?? [];
  const destinations = program.status === 'open' ? [program, ...targets] : targets;
  const target = destinations.find(({ id }) => id === targetId);
  const total = Math.round(original.reduce((sum, person) => sum + Number(person.total_price), 0) * 100) / 100;
  const rooms = (Object.keys(ROOM) as Room[]).filter(category => target && original.length > 0
    && !(target.id === program.id && category === original[0].room_type)
    && privateRoomTotal(target.inventory_private_prices?.[category], Number(target[`price_${category}`]),
      original.length, ROOM_SIZE[category]) === total && total > 0);
  const finance = useQuery({
    queryKey: ['pilgrimage-private-group-finance', orgId, bookingId],
    enabled: open && !!bookingId,
    queryFn: async () => {
      const { data, error } = await callUntypedRpc<Preview>('get_booking_cancellation_workflow', { _booking: bookingId });
      if (error) throw error;
      return data;
    },
  });
  const sourceInvoice = finance.data?.customer.invoices[0];
  const financeEligible = finance.isSuccess && !finance.isFetching && finance.data?.customer.invoices.length === 1
    && !finance.data.customer.blocked_reason && !finance.data.suppliers.length
    && sourceInvoice && Number(sourceInvoice.paid) === 0 && Number(sourceInvoice.due) === total;
  const amend = useMutation({
    mutationFn: async (request: Request) => {
      const { data, error } = await callUntypedRpc<{ replacement_booking_id: string }>(
        'amend_pilgrimage_private_group', request);
      if (error) throw error;
      if (!data?.replacement_booking_id) throw new Error('لم يصل تأكيد الحجز البديل. جرّب نفس الطلب.');
      return data;
    },
    onSuccess: ({ replacement_booking_id }) => {
      setSubmitted(null);
      setOpen(false);
      onChanged(replacement_booking_id);
      toast({ title: 'تم تعديل حجز الغرفة الخاصة لجميع المسافرين' });
    },
    onError: (error: { message?: string; code?: string }) => {
      if (error.code) {
        setSubmitted(null);
        setApproved(false);
        void finance.refetch();
      }
      toast({ title: 'تعذر تعديل الحجز', description: errors[error.message ?? ''] ?? error.message, variant: 'destructive' });
    },
  });
  const show = () => {
    if (submitted) {
      setOpen(true);
      return;
    }
    setBookingId('');
    setTargetId('');
    setRoom(undefined);
    setReason('');
    setApproved(false);
    setSubmitted(null);
    setOpen(true);
  };
  const valid = financeEligible && !!target && !!room && rooms.includes(room) && reason.trim().length >= 3 && approved;
  const submit = () => {
    if (submitted) {
      amend.mutate(submitted);
      return;
    }
    if (!valid || !room) return;
    const request = { _organization_id: orgId, _booking_id: bookingId, _id: crypto.randomUUID(),
      _target_program_id: targetId, _room_type: room, _expected_total: total, _reason: reason.trim() };
    setSubmitted(request);
    amend.mutate(request);
  };

  if (!groups.size && !submitted) return null;
  return <>
    <Button variant="outline" disabled={!submitted && (!eligible.length || !destinations.length)} onClick={show}>تعديل حجز غرفة خاصة بالكامل</Button>
    <Dialog open={open} onOpenChange={value => { if (!amend.isPending) setOpen(value); }}>
      <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>تعديل حجز غرفة خاصة بالكامل</DialogTitle>
          <DialogDescription>يُعاد حجز الغرفة والمقاعد لنفس المسافرين. الإجراء متاح بنفس الإجمالي للحجوزات غير المسددة.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="private-amend-booking">الحجز الأصلي</Label>
            <Select disabled={!!submitted} value={bookingId} onValueChange={value => {
              setBookingId(value); setTargetId(''); setRoom(undefined); setApproved(false);
            }}>
              <SelectTrigger id="private-amend-booking"><SelectValue placeholder="اختر الحجز" /></SelectTrigger>
              <SelectContent>{eligible.map(([id, group]) => (
                <SelectItem key={id} value={id}>{group[0].full_name} · {group.length} مسافر</SelectItem>
              ))}</SelectContent>
            </Select>
          </div>
          {original.length > 0 && <p className="text-sm">{original.map(person => person.full_name).join('، ')} · {money(total, program.currency)}</p>}
          {bookingId && finance.isFetching && <p role="status" className="text-sm text-muted-foreground">جارٍ التحقق من حالة الفاتورة…</p>}
          {bookingId && !finance.isFetching && !financeEligible && <p role="status" className="text-sm text-muted-foreground">
            {finance.isError ? 'تعذر التحقق من الفاتورة والموردين لهذا الحجز.' : 'هذا الحجز يحتاج مراجعة مالية قبل التعديل.'}
          </p>}
          <div className="space-y-1">
            <Label htmlFor="private-amend-program">الدفعة</Label>
            <Select disabled={!bookingId || !!submitted} value={targetId} onValueChange={value => {
              setTargetId(value); setRoom(undefined); setApproved(false);
            }}>
              <SelectTrigger id="private-amend-program"><SelectValue placeholder="اختر الدفعة" /></SelectTrigger>
              <SelectContent>{destinations.map(option => (
                <SelectItem key={option.id} value={option.id}>{option.name} · {option.departure_date}</SelectItem>
              ))}</SelectContent>
            </Select>
          </div>
          {target && !rooms.length && <p role="status" className="text-sm text-muted-foreground">مفيش فئة بنفس الإجمالي في الدفعة دي.</p>}
          <div className="space-y-1">
            <Label htmlFor="private-amend-room">فئة الغرفة</Label>
            <Select disabled={!rooms.length || !!submitted} value={room ?? ''} onValueChange={value => {
              setRoom(value as Room); setApproved(false);
            }}>
              <SelectTrigger id="private-amend-room"><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
              <SelectContent>{rooms.map(category => <SelectItem key={category} value={category}>{ROOM[category]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="private-amend-reason">سبب التعديل أو مرجع الموافقة</Label>
            <Textarea disabled={!!submitted} id="private-amend-reason" value={reason} maxLength={500} rows={2}
              onChange={event => { setReason(event.target.value); setApproved(false); }} />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="private-amend-approved" disabled={!!submitted} checked={approved}
              onCheckedChange={value => setApproved(value === true)} />
            <Label htmlFor="private-amend-approved">تم الاتفاق مع العميل على تعديل الحجز بالكامل بدون غرامة</Label>
          </div>
          <Button disabled={amend.isPending || (!submitted && !valid)} onClick={submit}>
            {submitted && !amend.isPending ? 'إعادة محاولة التنفيذ' : 'تأكيد تعديل الحجز'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
