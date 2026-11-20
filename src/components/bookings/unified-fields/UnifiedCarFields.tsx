import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FieldError } from '@/components/wizard/StepWizard';
import { applyCalculatedBookingAmount, bookingDayCount, optionalNonnegativeAmount } from '@/lib/bookingServiceFields';

interface UnifiedCarFieldsProps {
  formData: Record<string, any>;
  updateField: (key: string, value: any) => void;
  updateFields: (fields: Record<string, any>) => void;
  errors: Record<string, string>;
}

const carTotal = (data: Record<string, unknown>) => {
  const days = bookingDayCount(data.pickup_date, data.dropoff_date, true);
  const rate = optionalNonnegativeAmount(data.daily_rate);
  return days !== null && rate !== null ? days * rate : null;
};

const UnifiedCarFields = ({ formData, updateField, updateFields, errors }: UnifiedCarFieldsProps) => {
  const days = bookingDayCount(formData.pickup_date, formData.dropoff_date, true);
  const updatePricing = (key: string, value: string) => {
    const next = { ...formData, [key]: value };
    const selling = applyCalculatedBookingAmount(formData.selling_price, carTotal(formData), carTotal(next));
    updateFields({ [key]: value, ...(selling !== undefined ? { selling_price: selling } : {}) });
  };

  return (
    <div className="space-y-4">
      {/* نوع السيارة */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>نوع السيارة *</Label>
          <Input value={formData.car_type || ''} onChange={e => updateField('car_type', e.target.value)} placeholder="مثال: سيدان، SUV" />
          <FieldError error={errors.car_type} />
        </div>
        <div>
          <Label>سعر البيع اليومي</Label>
          <Input type="number" min={0} step="0.01" value={formData.daily_rate ?? ''} onChange={e => updatePricing('daily_rate', e.target.value)} placeholder="0" />
          <FieldError error={errors.daily_rate} />
        </div>
      </div>

      {/* مواقع الاستلام والتسليم */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>موقع الاستلام</Label>
          <Input value={formData.pickup_location || ''} onChange={e => updateField('pickup_location', e.target.value)} placeholder="موقع الاستلام" />
        </div>
        <div>
          <Label>موقع التسليم</Label>
          <Input value={formData.dropoff_location || ''} onChange={e => updateField('dropoff_location', e.target.value)} placeholder="موقع التسليم" />
        </div>
      </div>

      {/* تواريخ + المدة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>تاريخ الاستلام</Label>
          <Input type="date" value={formData.pickup_date || ''} onChange={e => updatePricing('pickup_date', e.target.value)} />
          <FieldError error={errors.pickup_date} />
        </div>
        <div>
          <Label>تاريخ التسليم</Label>
          <Input type="date" value={formData.dropoff_date || ''} onChange={e => updatePricing('dropoff_date', e.target.value)} />
          <FieldError error={errors.dropoff_date} />
        </div>
        <div>
          <Label>عدد الأيام</Label>
          <Input type="number" value={days ?? ''} readOnly className="bg-muted/50" />
        </div>
      </div>

      {/* التأمين */}
      <div className="flex items-center gap-3 p-3 rounded-lg border">
        <Switch checked={formData.insurance_included || false} onCheckedChange={v => updateField('insurance_included', v)} />
        <Label>تأمين شامل</Label>
      </div>
    </div>
  );
};

export default UnifiedCarFields;
