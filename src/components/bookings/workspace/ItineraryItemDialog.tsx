import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export type ItineraryKind = 'hotel' | 'flight' | 'transport' | 'car';

const TABLES: Record<ItineraryKind, string> = {
  hotel: 'booking_hotel_details',
  flight: 'booking_flight_details',
  transport: 'booking_transport_details',
  car: 'booking_car_details',
};

const TITLES: Record<ItineraryKind, string> = {
  hotel: 'تفاصيل الفندق',
  flight: 'تفاصيل الطيران',
  transport: 'تفاصيل النقل',
  car: 'تفاصيل تأجير السيارة',
};

interface FieldDef {
  key: string;
  label: string;
  type?: 'text' | 'date' | 'number' | 'time';
}

const FIELDS: Record<ItineraryKind, FieldDef[]> = {
  hotel: [
    { key: 'hotel_name', label: 'اسم الفندق' },
    { key: 'city', label: 'المدينة' },
    { key: 'room_type', label: 'نوع الغرفة' },
    { key: 'board_type', label: 'الإقامة' },
    { key: 'check_in', label: 'تاريخ الدخول', type: 'date' },
    { key: 'check_out', label: 'تاريخ الخروج', type: 'date' },
    { key: 'rooms', label: 'عدد الغرف', type: 'number' },
    { key: 'adults', label: 'عدد البالغين', type: 'number' },
    { key: 'booking_reference', label: 'رقم تأكيد المورد' },
  ],
  flight: [
    { key: 'airline', label: 'شركة الطيران' },
    { key: 'flight_number', label: 'رقم الرحلة' },
    { key: 'departure_airport', label: 'مطار المغادرة' },
    { key: 'arrival_airport', label: 'مطار الوصول' },
    { key: 'departure_date', label: 'تاريخ المغادرة', type: 'date' },
    { key: 'departure_time', label: 'وقت المغادرة', type: 'time' },
    { key: 'arrival_date', label: 'تاريخ الوصول', type: 'date' },
    { key: 'passengers_count', label: 'عدد المسافرين', type: 'number' },
    { key: 'flight_class', label: 'درجة السفر' },
    { key: 'pnr', label: 'PNR' },
    { key: 'ticket_number', label: 'رقم التذكرة' },
  ],
  transport: [
    { key: 'vehicle_type', label: 'نوع المركبة' },
    { key: 'route', label: 'المسار' },
    { key: 'pickup_point', label: 'نقطة الالتقاط' },
    { key: 'dropoff_point', label: 'نقطة التوصيل' },
    { key: 'passengers', label: 'عدد الركاب', type: 'number' },
  ],
  car: [
    { key: 'car_type', label: 'نوع السيارة' },
    { key: 'pickup_location', label: 'مكان الاستلام' },
    { key: 'dropoff_location', label: 'مكان التسليم' },
    { key: 'pickup_date', label: 'من تاريخ', type: 'date' },
    { key: 'dropoff_date', label: 'إلى تاريخ', type: 'date' },
    { key: 'daily_rate', label: 'السعر اليومي', type: 'number' },
  ],
};

const DATE_KEYS: Record<ItineraryKind, { start?: string; end?: string }> = {
  hotel: { start: 'check_in', end: 'check_out' },
  flight: { start: 'departure_date', end: 'arrival_date' },
  transport: {},
  car: { start: 'pickup_date', end: 'dropoff_date' },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: ItineraryKind;
  bookingId: string;
  booking: any;
  existing: any | null;
  onSaved: () => void;
}

const anyClient = supabase as any;

export const ItineraryItemDialog = ({
  open,
  onOpenChange,
  kind,
  bookingId,
  booking,
  existing,
  onSaved,
}: Props) => {
  const qc = useQueryClient();
  const fields = FIELDS[kind];
  const [values, setValues] = useState<Record<string, string>>({});
  const [selling, setSelling] = useState('');
  const [cost, setCost] = useState('');

  useEffect(() => {
    if (!open) return;
    const initial: Record<string, string> = {};
    fields.forEach((f) => {
      const v = existing?.[f.key];
      initial[f.key] = v == null ? '' : String(v);
    });
    setValues(initial);
    setSelling(existing?.selling_amount ? String(existing.selling_amount) : '');
    setCost(existing?.cost_amount ? String(existing.cost_amount) : '');
  }, [open, existing, kind]);

  const currency = booking?.currency ?? 'EGP';

  const syncFinancials = async () => {
    const { error } = await anyClient.rpc('sync_booking_financials', { p_booking_id: bookingId });
    if (error) throw error;
  };

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['workspace-itinerary', bookingId] });
    qc.invalidateQueries({ queryKey: ['workspace-booking', bookingId] });
    qc.invalidateQueries({ queryKey: ['workspace-timeline', bookingId] });
    qc.invalidateQueries({ queryKey: ['booking-profit-cockpit', bookingId] });
    qc.invalidateQueries({ queryKey: ['booking-financials', bookingId] });
    qc.invalidateQueries({ queryKey: ['workspace-invoices', bookingId] });
    qc.invalidateQueries({ queryKey: ['bookings'] });
    qc.invalidateQueries({ queryKey: ['invoices'] });
  };

  const save = useMutation({
    mutationFn: async () => {
      const payload: Record<string, any> = { booking_id: bookingId };
      fields.forEach((f) => {
        const raw = values[f.key];
        if (raw === '' || raw == null) {
          payload[f.key] = null;
          return;
        }
        payload[f.key] = f.type === 'number' ? Number(raw) : raw;
      });

      if (kind === 'hotel' && payload.check_in && payload.check_out) {
        const nights = Math.max(
          1,
          Math.ceil(
            (new Date(payload.check_out).getTime() - new Date(payload.check_in).getTime()) /
              (1000 * 60 * 60 * 24),
          ),
        );
        payload.nights = nights;
      }

      // Per-service amounts drive the booking totals, the customer invoice and the journals.
      payload.selling_amount = Number(selling) || 0;
      payload.cost_amount = Number(cost) || 0;

      if (existing?.id) {
        const { error } = await anyClient
          .from(TABLES[kind])
          .update(payload)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await anyClient.from(TABLES[kind]).insert(payload);
        if (error) throw error;
      }

      const dateKeys = DATE_KEYS[kind];
      const startVal = dateKeys.start ? payload[dateKeys.start] : null;
      const endVal = dateKeys.end ? payload[dateKeys.end] : null;

      const bookingPatch: Record<string, any> = {};
      if (startVal && (!booking?.start_date || startVal < booking.start_date)) {
        bookingPatch.start_date = startVal;
      }
      if (endVal && (!booking?.end_date || endVal > booking.end_date)) {
        bookingPatch.end_date = endVal;
      }
      if (Object.keys(bookingPatch).length) {
        const { error } = await anyClient.from('bookings').update(bookingPatch).eq('id', bookingId);
        if (error) throw error;
      }

      await syncFinancials();

      await anyClient.from('booking_timeline_events').insert({
        booking_id: bookingId,
        organization_id: booking?.organization_id,
        kind: 'itinerary_updated',
        summary: `${existing?.id ? 'تحديث' : 'إضافة'} ${TITLES[kind]}`,
        payload: {
          service: kind,
          selling_amount: payload.selling_amount,
          cost_amount: payload.cost_amount,
        },
      });
    },
    onSuccess: () => {
      toast.success('تم حفظ الخدمة وتحديث الفاتورة والحسابات');
      invalidateAll();
      onSaved();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || 'تعذر حفظ الخدمة'),
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!existing?.id) return;
      const { error } = await anyClient.from(TABLES[kind]).delete().eq('id', existing.id);
      if (error) throw error;
      await syncFinancials();
    },
    onSuccess: () => {
      toast.success('تم حذف الخدمة وتحديث الفاتورة والحسابات');
      invalidateAll();
      onSaved();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message || 'تعذر حذف الخدمة'),
  });


  const busy = save.isPending || remove.isPending;

  const columns = useMemo(() => (fields.length > 5 ? 'md:grid-cols-2' : ''), [fields.length]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{TITLES[kind]}</DialogTitle>
          <DialogDescription>
            تُضاف الخدمة داخل هذا الحجز مباشرة وتظهر ضمن برنامج العميل وحسابه.
          </DialogDescription>
        </DialogHeader>

        <div className={`grid gap-3 ${columns}`}>
          {fields.map((f) => (
            <div key={f.key} className="space-y-1">
              <Label htmlFor={f.key} className="text-xs">
                {f.label}
              </Label>
              <Input
                id={f.key}
                type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'time' ? 'time' : 'text'}
                value={values[f.key] ?? ''}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 border-t pt-4">
          <div className="space-y-1">
            <Label htmlFor="add_selling" className="text-xs">
              سعر بيع هذه الخدمة للعميل ({currency})
            </Label>
            <Input
              id="add_selling"
              type="number"
              step="0.01"
              value={selling}
              onChange={(e) => setSelling(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="add_cost" className="text-xs">
              تكلفة هذه الخدمة من المورد ({currency})
            </Label>
            <Input
              id="add_cost"
              type="number"
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0"
            />
          </div>
          <p className="md:col-span-2 text-xs text-muted-foreground">
            يُضاف المبلغ كبند مستقل في فاتورة العميل ويُحدَّث إجمالي الحجز والربحية والقيود تلقائيًا.
          </p>

        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {existing?.id ? (
            <Button variant="destructive" disabled={busy} onClick={() => remove.mutate()}>
              حذف الخدمة
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button disabled={busy} onClick={() => save.mutate()}>
              {busy ? 'جاري الحفظ...' : 'حفظ داخل الحجز'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
