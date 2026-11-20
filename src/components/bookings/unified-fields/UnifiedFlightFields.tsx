import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { List, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FieldError } from '@/components/wizard/StepWizard';
import { supabase } from '@/integrations/supabase/client';
import {
  applyCalculatedBookingAmount,
  findFlightCatalogEntry,
  optionalNonnegativeAmount,
  resolveFlightCatalogLabel,
  type FlightCatalogEntry,
} from '@/lib/bookingServiceFields';

interface UnifiedFlightFieldsProps {
  formData: Record<string, any>;
  updateField: (key: string, value: any) => void;
  updateFields: (fields: Record<string, any>) => void;
  errors: Record<string, string>;
}

const emptyCatalog: FlightCatalogEntry[] = [];
const fallbackClasses: FlightCatalogEntry[] = [
  { id: 'economy', name: 'Economy', name_ar: 'اقتصادي' },
  { id: 'business', name: 'Business', name_ar: 'أعمال' },
  { id: 'first', name: 'First', name_ar: 'أولى' },
];

const returnFields = [
  'return_flight_number', 'return_departure_airport', 'return_arrival_airport',
  'return_departure_date', 'return_departure_time', 'return_arrival_date', 'return_arrival_time',
];

function FlightCatalogField({ id, label, value, entries, onChange, error, airport = false }: {
  id: string;
  label: string;
  value?: string;
  entries: readonly FlightCatalogEntry[];
  onChange: (value: string) => void;
  error?: string;
  airport?: boolean;
}) {
  const [manual, setManual] = useState<boolean>();
  const selected = findFlightCatalogEntry(value, entries);
  const visibleValue = resolveFlightCatalogLabel(value);
  const isManual = !entries.length || (manual ?? (!!visibleValue && !selected));
  const manualValue = visibleValue !== undefined || !value?.trim() ? value ?? '' : '';
  const placeholder = airport ? 'اكتب اسم المطار أو الكود' : 'اكتب اسمًا';

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {!!entries.length && (
          <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={() => setManual(!isManual)}>
            {isManual ? <List className="size-3" aria-hidden="true" /> : <Pencil className="size-3" aria-hidden="true" />}
            {isManual ? 'اختيار من القائمة' : 'إدخال يدوي'}
          </Button>
        )}
      </div>
      {isManual ? (
        <Input id={id} value={manualValue} onChange={event => {
          setManual(true);
          onChange(event.target.value);
        }} maxLength={160} placeholder={placeholder} />
      ) : (
        <Select value={selected?.id || ''} onValueChange={id => {
          const entry = entries.find(item => item.id === id);
          if (entry) onChange(airport ? entry.iata_code || entry.icao_code || entry.name : entry.name_ar || entry.name);
        }}>
          <SelectTrigger id={id}><SelectValue placeholder="اختر من القائمة" /></SelectTrigger>
          <SelectContent>
            {entries.map(entry => (
              <SelectItem key={entry.id} value={entry.id}>
                {entry.name_ar || entry.name}{(entry.iata_code || entry.code) ? ` (${entry.iata_code || entry.code})` : ''}
                {entry.city ? ` – ${entry.city}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <FieldError error={error} />
    </div>
  );
}

function flightTotal(data: Record<string, unknown>) {
  const passengers = Number(data.passengers_count || 1);
  const price = optionalNonnegativeAmount(data.ticket_price_per_person);
  const fees = optionalNonnegativeAmount(data.taxes_and_fees);
  if (!Number.isInteger(passengers) || passengers < 1 || (price === null && fees === null)) return null;
  return (price ?? 0) * passengers + (fees ?? 0);
}

const UnifiedFlightFields = ({ formData, updateField, updateFields, errors }: UnifiedFlightFieldsProps) => {
  const { data: airports = emptyCatalog } = useQuery({
    queryKey: ['airports-active', 'booking-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('airports').select('id, name, iata_code, icao_code, city')
        .eq('is_active', true).order('name').range(0, 19999);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: airlines = emptyCatalog } = useQuery({
    queryKey: ['airlines-active', 'booking-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('airlines').select('id, name, iata_code, icao_code')
        .eq('is_active', true).order('name').range(0, 9999);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: classes = fallbackClasses } = useQuery({
    queryKey: ['flight-classes', 'booking-catalog'],
    queryFn: async () => {
      const { data, error } = await supabase.from('flight_classes').select('id, name, name_ar, code').order('name');
      if (error) throw error;
      return data?.length ? data : fallbackClasses;
    },
    staleTime: 5 * 60 * 1000,
  });

  const airlineValue = formData.airline as string | undefined;
  const cabinValue = formData.flight_class as string | undefined;
  const oldAirlineName = formData.airline_name as string | undefined;
  useEffect(() => {
    // Earlier drafts saved catalog UUIDs. Convert exact matches once the directory loads.
    for (const [field, value, catalog] of [
      ['airline', airlineValue, airlines],
      ['flight_class', cabinValue, classes],
    ] as const) {
      if (value && !resolveFlightCatalogLabel(value)) {
        const text = resolveFlightCatalogLabel(value, catalog) ?? (field === 'airline' ? oldAirlineName?.trim() : undefined);
        if (text) updateField(field, text);
      }
    }
  }, [airlineValue, cabinValue, oldAirlineName, airlines, classes, updateField]);

  const updatePricing = (key: string, value: string) => {
    const selling = applyCalculatedBookingAmount(formData.selling_price, flightTotal(formData), flightTotal({ ...formData, [key]: value }));
    updateFields({ [key]: value, ...(selling !== undefined ? { selling_price: selling } : {}) });
  };

  const changeRoundTrip = (enabled: boolean) => {
    if (!enabled) {
      updateFields({ is_round_trip: false, ...Object.fromEntries(returnFields.map(key => [key, ''])) });
      return;
    }
    updateFields({
      is_round_trip: true,
      return_departure_airport: formData.return_departure_airport || formData.arrival_airport || '',
      return_arrival_airport: formData.return_arrival_airport || formData.departure_airport || '',
    });
  };

  const airportField = (key: string, label: string) => (
    <FlightCatalogField id={key} label={label} value={formData[key]} entries={airports}
      onChange={value => updateField(key, value)} error={errors[key]} airport />
  );

  const dateOrTime = (field: string, label: string, type: 'date' | 'time') => (
    <div>
      <Label htmlFor={field}>{label}</Label>
      <Input id={field} type={type} value={formData[field] || ''} onChange={event => updateField(field, event.target.value)} />
      <FieldError error={errors[field]} />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <FlightCatalogField id="airline" label="شركة الطيران *" value={airlineValue} entries={airlines}
          onChange={value => updateFields({ airline: value, airline_name: '' })} error={errors.airline} />
        <div>
          <Label htmlFor="flight_number">رقم الرحلة</Label>
          <Input id="flight_number" value={formData.flight_number || ''} onChange={event => updateField('flight_number', event.target.value)} placeholder="مثال: MS-123" />
        </div>
        <FlightCatalogField id="flight_class" label="درجة السفر" value={cabinValue} entries={classes}
          onChange={value => updateField('flight_class', value)} error={errors.flight_class} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {airportField('departure_airport', 'مطار المغادرة *')}
        {airportField('arrival_airport', 'مطار الوصول *')}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {dateOrTime('departure_date', 'تاريخ المغادرة *', 'date')}
        {dateOrTime('departure_time', 'وقت المغادرة', 'time')}
        {dateOrTime('arrival_date', 'تاريخ الوصول *', 'date')}
        {dateOrTime('arrival_time', 'وقت الوصول', 'time')}
      </div>

      <div className="flex items-center gap-3">
        <Switch id="flight-round-trip" checked={!!formData.is_round_trip} onCheckedChange={changeRoundTrip} />
        <Label htmlFor="flight-round-trip">رحلة ذهاب وعودة</Label>
      </div>
      {formData.is_round_trip && (
        <fieldset className="space-y-3 rounded-lg border p-4">
          <legend className="px-1 text-sm font-semibold">رحلة العودة</legend>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label htmlFor="return_flight_number">رقم رحلة العودة</Label>
              <Input id="return_flight_number" maxLength={40} value={formData.return_flight_number || ''}
                onChange={event => updateField('return_flight_number', event.target.value)} />
            </div>
            {airportField('return_departure_airport', 'مطار مغادرة العودة *')}
            {airportField('return_arrival_airport', 'مطار وصول العودة *')}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {dateOrTime('return_departure_date', 'تاريخ مغادرة العودة *', 'date')}
            {dateOrTime('return_departure_time', 'وقت مغادرة العودة', 'time')}
            {dateOrTime('return_arrival_date', 'تاريخ وصول العودة *', 'date')}
            {dateOrTime('return_arrival_time', 'وقت وصول العودة', 'time')}
          </div>
        </fieldset>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <Label htmlFor="passengers_count">عدد المسافرين</Label>
          <Input id="passengers_count" type="number" min={1} value={formData.passengers_count ?? 1}
            onChange={event => updatePricing('passengers_count', event.target.value)} />
          <FieldError error={errors.passengers_count} />
        </div>
        <div>
          <Label htmlFor="ticket_price_per_person">سعر بيع التذكرة للفرد</Label>
          <Input id="ticket_price_per_person" type="number" min={0} step="0.01" value={formData.ticket_price_per_person ?? ''}
            onChange={event => updatePricing('ticket_price_per_person', event.target.value)} />
          <FieldError error={errors.ticket_price_per_person} />
        </div>
        <div>
          <Label htmlFor="taxes_and_fees">إجمالي ضرائب ورسوم الحجز</Label>
          <Input id="taxes_and_fees" type="number" min={0} step="0.01" value={formData.taxes_and_fees ?? ''}
            onChange={event => updatePricing('taxes_and_fees', event.target.value)} />
          <FieldError error={errors.taxes_and_fees} />
        </div>
        <p className="text-xs text-muted-foreground md:col-span-3">
          يتكوّن سعر البيع المقترح من سعر التذكرة × عدد المسافرين + إجمالي الرسوم. تقدر تعدّل سعر البيع النهائي في الأسعار والتكاليف.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <Label htmlFor="flight-pnr">رقم PNR</Label>
          <Input id="flight-pnr" value={formData.pnr || ''} onChange={event => updateField('pnr', event.target.value)} />
        </div>
        <div>
          <Label htmlFor="flight-ticket">رقم التذكرة</Label>
          <Input id="flight-ticket" value={formData.ticket_number || ''} onChange={event => updateField('ticket_number', event.target.value)} />
        </div>
        <div>
          <Label htmlFor="seat_preferences">تفضيلات المقعد</Label>
          <Input id="seat_preferences" value={formData.seat_preferences || ''} onChange={event => updateField('seat_preferences', event.target.value)} placeholder="نافذة، ممر..." />
        </div>
        <div>
          <Label htmlFor="meal_preferences">تفضيلات الوجبات</Label>
          <Input id="meal_preferences" value={formData.meal_preferences || ''} onChange={event => updateField('meal_preferences', event.target.value)} placeholder="حلال، نباتي..." />
        </div>
      </div>
    </div>
  );
};

export default UnifiedFlightFields;
