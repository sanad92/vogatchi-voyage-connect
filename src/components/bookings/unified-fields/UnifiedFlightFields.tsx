import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { FieldError } from '@/components/wizard/StepWizard';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface UnifiedFlightFieldsProps {
  formData: Record<string, any>;
  updateField: (key: string, value: any) => void;
  updateFields: (fields: Record<string, any>) => void;
  errors: Record<string, string>;
}

const UnifiedFlightFields = ({ formData, updateField, updateFields, errors }: UnifiedFlightFieldsProps) => {
  const { data: airports } = useQuery({
    queryKey: ['airports-active'],
    queryFn: async () => {
      const { data } = await supabase.from('airports').select('*').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const { data: airlines } = useQuery({
    queryKey: ['airlines-active'],
    queryFn: async () => {
      const { data } = await supabase.from('airlines').select('*').eq('is_active', true).order('name');
      return data || [];
    },
  });

  const { data: flightClasses } = useQuery({
    queryKey: ['flight-classes'],
    queryFn: async () => {
      const { data } = await supabase.from('flight_classes').select('*').order('name');
      return data || [];
    },
  });

  // حساب التكلفة الإجمالية
  useEffect(() => {
    const passengers = Number(formData.passengers_count) || 1;
    const ticketPrice = Number(formData.ticket_price_per_person) || 0;
    const taxes = Number(formData.taxes_and_fees) || 0;
    const total = (ticketPrice * passengers) + taxes;
    if (total > 0 && total !== Number(formData.selling_price)) {
      updateField('selling_price', total);
    }
  }, [formData.passengers_count, formData.ticket_price_per_person, formData.taxes_and_fees]);

  return (
    <div className="space-y-4">
      {/* شركة الطيران + رقم الرحلة + درجة السفر */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>شركة الطيران *</Label>
          {airlines && airlines.length > 0 ? (
            <Select value={formData.airline || ''} onValueChange={v => {
              const al = airlines.find((a: any) => a.id === v);
              updateFields({ airline: v, airline_name: al?.name || '' });
            }}>
              <SelectTrigger><SelectValue placeholder="اختر شركة الطيران" /></SelectTrigger>
              <SelectContent>
                {airlines.map((a: any) => (
                  <SelectItem key={a.id} value={a.id}>{a.name} {a.iata_code ? `(${a.iata_code})` : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={formData.airline || ''} onChange={e => updateField('airline', e.target.value)} placeholder="شركة الطيران" />
          )}
          <FieldError error={errors.airline} />
        </div>
        <div>
          <Label>رقم الرحلة</Label>
          <Input value={formData.flight_number || ''} onChange={e => updateField('flight_number', e.target.value)} placeholder="مثال: MS-123" />
        </div>
        <div>
          <Label>درجة السفر</Label>
          {flightClasses && flightClasses.length > 0 ? (
            <Select value={formData.flight_class || ''} onValueChange={v => updateField('flight_class', v)}>
              <SelectTrigger><SelectValue placeholder="اختر الدرجة" /></SelectTrigger>
              <SelectContent>
                {flightClasses.map((fc: any) => (
                  <SelectItem key={fc.id} value={fc.id}>{fc.name_ar || fc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Select value={formData.flight_class || ''} onValueChange={v => updateField('flight_class', v)}>
              <SelectTrigger><SelectValue placeholder="اختر الدرجة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="economy">اقتصادي</SelectItem>
                <SelectItem value="business">أعمال</SelectItem>
                <SelectItem value="first">أولى</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* المطارات */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>مطار المغادرة *</Label>
          {airports && airports.length > 0 ? (
            <Select value={formData.departure_airport || ''} onValueChange={v => updateField('departure_airport', v)}>
              <SelectTrigger><SelectValue placeholder="اختر مطار المغادرة" /></SelectTrigger>
              <SelectContent>
                {airports.map((a: any) => (
                  <SelectItem key={a.id} value={a.iata_code || a.id}>{a.name} ({a.iata_code}) - {a.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={formData.departure_airport || ''} onChange={e => updateField('departure_airport', e.target.value)} placeholder="مطار المغادرة" />
          )}
        </div>
        <div>
          <Label>مطار الوصول *</Label>
          {airports && airports.length > 0 ? (
            <Select value={formData.arrival_airport || ''} onValueChange={v => updateField('arrival_airport', v)}>
              <SelectTrigger><SelectValue placeholder="اختر مطار الوصول" /></SelectTrigger>
              <SelectContent>
                {airports.map((a: any) => (
                  <SelectItem key={a.id} value={a.iata_code || a.id}>{a.name} ({a.iata_code}) - {a.city}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={formData.arrival_airport || ''} onChange={e => updateField('arrival_airport', e.target.value)} placeholder="مطار الوصول" />
          )}
        </div>
      </div>

      {/* تواريخ وأوقات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <Label>تاريخ المغادرة *</Label>
          <Input type="date" value={formData.departure_date || ''} onChange={e => updateField('departure_date', e.target.value)} />
        </div>
        <div>
          <Label>وقت المغادرة</Label>
          <Input type="time" value={formData.departure_time || ''} onChange={e => updateField('departure_time', e.target.value)} />
        </div>
        <div>
          <Label>تاريخ الوصول</Label>
          <Input type="date" value={formData.arrival_date || ''} onChange={e => updateField('arrival_date', e.target.value)} />
        </div>
        <div>
          <Label>وقت الوصول</Label>
          <Input type="time" value={formData.arrival_time || ''} onChange={e => updateField('arrival_time', e.target.value)} />
        </div>
      </div>

      {/* المسافرين + السعر + الضرائب */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>عدد المسافرين</Label>
          <Input type="number" min={1} value={formData.passengers_count || 1} onChange={e => updateField('passengers_count', Number(e.target.value))} />
        </div>
        <div>
          <Label>سعر التذكرة للفرد</Label>
          <Input type="number" value={formData.ticket_price_per_person || ''} onChange={e => updateField('ticket_price_per_person', e.target.value)} placeholder="0" />
        </div>
        <div>
          <Label>الضرائب والرسوم</Label>
          <Input type="number" value={formData.taxes_and_fees || ''} onChange={e => updateField('taxes_and_fees', e.target.value)} placeholder="0" />
        </div>
      </div>

      {/* PNR + رقم التذكرة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>رقم PNR</Label>
          <Input value={formData.pnr || ''} onChange={e => updateField('pnr', e.target.value)} placeholder="رقم الحجز PNR" />
        </div>
        <div>
          <Label>رقم التذكرة</Label>
          <Input value={formData.ticket_number || ''} onChange={e => updateField('ticket_number', e.target.value)} placeholder="رقم التذكرة" />
        </div>
      </div>

      {/* ذهاب وعودة + تفضيلات */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex items-center gap-3 pt-6">
          <Switch checked={formData.is_round_trip || false} onCheckedChange={v => updateField('is_round_trip', v)} />
          <Label>رحلة ذهاب وعودة</Label>
        </div>
        <div>
          <Label>تفضيلات المقعد</Label>
          <Input value={formData.seat_preferences || ''} onChange={e => updateField('seat_preferences', e.target.value)} placeholder="نافذة، ممر..." />
        </div>
        <div>
          <Label>تفضيلات الوجبات</Label>
          <Input value={formData.meal_preferences || ''} onChange={e => updateField('meal_preferences', e.target.value)} placeholder="حلال، نباتي..." />
        </div>
      </div>
    </div>
  );
};

export default UnifiedFlightFields;
