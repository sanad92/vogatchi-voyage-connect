import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FieldError } from '@/components/wizard/StepWizard';

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'سيدان' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: 'فان' },
  { value: 'minibus', label: 'ميني باص' },
  { value: 'bus', label: 'باص' },
  { value: 'limousine', label: 'ليموزين' },
];

interface UnifiedTransportFieldsProps {
  formData: Record<string, any>;
  updateField: (key: string, value: any) => void;
  updateFields: (fields: Record<string, any>) => void;
  errors: Record<string, string>;
}

const UnifiedTransportFields = ({ formData, updateField, updateFields, errors }: UnifiedTransportFieldsProps) => {
  return (
    <div className="space-y-4">
      {/* نوع المركبة + عدد الركاب */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>نوع المركبة *</Label>
          <Select value={formData.vehicle_type || ''} onValueChange={v => updateField('vehicle_type', v)}>
            <SelectTrigger><SelectValue placeholder="اختر نوع المركبة" /></SelectTrigger>
            <SelectContent>
              {VEHICLE_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <FieldError error={errors.vehicle_type} />
        </div>
        <div>
          <Label>عدد الركاب</Label>
          <Input type="number" min={1} value={formData.passengers || 1} onChange={e => updateField('passengers', Number(e.target.value))} />
        </div>
      </div>

      {/* المسار */}
      <div>
        <Label>المسار</Label>
        <Input value={formData.route || ''} onChange={e => updateField('route', e.target.value)} placeholder="مثال: القاهرة - شرم الشيخ" />
      </div>

      {/* نقاط الالتقاط والتوصيل */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>نقطة الالتقاط</Label>
          <Input value={formData.pickup_point || ''} onChange={e => updateField('pickup_point', e.target.value)} placeholder="عنوان الالتقاط" />
        </div>
        <div>
          <Label>نقطة التوصيل</Label>
          <Input value={formData.dropoff_point || ''} onChange={e => updateField('dropoff_point', e.target.value)} placeholder="عنوان التوصيل" />
        </div>
      </div>
    </div>
  );
};

export default UnifiedTransportFields;
