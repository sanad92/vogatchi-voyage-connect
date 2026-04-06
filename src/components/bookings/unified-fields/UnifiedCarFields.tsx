import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FieldError } from '@/components/wizard/StepWizard';
import { useEffect } from 'react';

interface UnifiedCarFieldsProps {
  formData: Record<string, any>;
  updateField: (key: string, value: any) => void;
  updateFields: (fields: Record<string, any>) => void;
  errors: Record<string, string>;
}

const UnifiedCarFields = ({ formData, updateField, updateFields, errors }: UnifiedCarFieldsProps) => {
  // حساب المدة والتكلفة تلقائياً
  useEffect(() => {
    if (formData.pickup_date && formData.dropoff_date) {
      const pickup = new Date(formData.pickup_date);
      const dropoff = new Date(formData.dropoff_date);
      const days = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 0) {
        updateField('rental_days', days);
        const rate = Number(formData.daily_rate) || 0;
        if (rate > 0) {
          updateField('selling_price', rate * days);
        }
      }
    }
  }, [formData.pickup_date, formData.dropoff_date, formData.daily_rate]);

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
          <Label>السعر اليومي</Label>
          <Input type="number" value={formData.daily_rate || ''} onChange={e => updateField('daily_rate', e.target.value)} placeholder="0" />
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
          <Input type="date" value={formData.pickup_date || ''} onChange={e => updateField('pickup_date', e.target.value)} />
        </div>
        <div>
          <Label>تاريخ التسليم</Label>
          <Input type="date" value={formData.dropoff_date || ''} onChange={e => updateField('dropoff_date', e.target.value)} />
        </div>
        <div>
          <Label>عدد الأيام</Label>
          <Input type="number" value={formData.rental_days || ''} readOnly className="bg-muted/50" />
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
