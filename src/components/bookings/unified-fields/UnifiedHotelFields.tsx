import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { FieldError } from '@/components/wizard/StepWizard';
import { Star } from 'lucide-react';
import { useEffect } from 'react';

const MEAL_PLANS = [
  { value: 'RO', label: 'بدون وجبات (RO)' },
  { value: 'BB', label: 'إفطار فقط (BB)' },
  { value: 'HB', label: 'نصف إقامة (HB)' },
  { value: 'FB', label: 'إقامة كاملة (FB)' },
  { value: 'ALL', label: 'شامل (ALL)' },
  { value: 'UAI', label: 'شامل فاخر (UAI)' },
  { value: 'SAL', label: 'شامل ناعم (SAL)' },
];

const ROOM_TYPES = [
  { value: 'single', label: 'فردية' },
  { value: 'double', label: 'مزدوجة' },
  { value: 'triple', label: 'ثلاثية' },
  { value: 'suite', label: 'جناح' },
  { value: 'family', label: 'عائلية' },
];

interface UnifiedHotelFieldsProps {
  formData: Record<string, any>;
  updateField: (key: string, value: any) => void;
  updateFields: (fields: Record<string, any>) => void;
  errors: Record<string, string>;
}

const UnifiedHotelFields = ({ formData, updateField, updateFields, errors }: UnifiedHotelFieldsProps) => {
  // حساب عدد الليالي تلقائياً
  useEffect(() => {
    if (formData.check_in && formData.check_out) {
      const checkIn = new Date(formData.check_in);
      const checkOut = new Date(formData.check_out);
      const diffTime = checkOut.getTime() - checkIn.getTime();
      const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (nights > 0 && nights !== formData.nights) {
        updateField('nights', nights);
      }
    }
  }, [formData.check_in, formData.check_out]);

  // حساب التكلفة الإجمالية عند تغيير عدد الليالي أو السعر
  useEffect(() => {
    const nights = Number(formData.nights) || 0;
    const costPerNight = Number(formData.cost_per_night) || 0;
    const sellingPerNight = Number(formData.selling_per_night) || 0;
    const rooms = Number(formData.rooms) || 1;

    if (nights > 0) {
      const totalCost = costPerNight * nights * rooms;
      const totalSelling = sellingPerNight * nights * rooms;
      if (totalCost > 0) updateField('cost_price', totalCost);
      if (totalSelling > 0) updateField('selling_price', totalSelling);
    }
  }, [formData.nights, formData.cost_per_night, formData.selling_per_night, formData.rooms]);

  return (
    <div className="space-y-4">
      {/* اسم الفندق + التصنيف */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <Label>اسم الفندق *</Label>
          <Input value={formData.hotel_name || ''} onChange={e => updateField('hotel_name', e.target.value)} placeholder="اسم الفندق" />
          <FieldError error={errors.hotel_name} />
        </div>
        <div>
          <Label>التصنيف (نجوم)</Label>
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(s => (
              <button key={s} type="button" onClick={() => updateField('star_rating', s)}
                className="focus:outline-none">
                <Star className={`h-6 w-6 ${s <= (formData.star_rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* المدينة + نوع الغرفة + عدد الغرف */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>المدينة</Label>
          <Input value={formData.city || ''} onChange={e => updateField('city', e.target.value)} placeholder="مدينة الوجهة" />
        </div>
        <div>
          <Label>نوع الغرفة</Label>
          <Select value={formData.room_type || ''} onValueChange={v => updateField('room_type', v)}>
            <SelectTrigger><SelectValue placeholder="اختر نوع الغرفة" /></SelectTrigger>
            <SelectContent>
              {ROOM_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>عدد الغرف</Label>
          <Input type="number" min={1} value={formData.rooms || 1} onChange={e => updateField('rooms', Number(e.target.value))} />
        </div>
      </div>

      {/* تواريخ الدخول والخروج + الليالي */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>تسجيل الدخول *</Label>
          <Input type="date" value={formData.check_in || ''} onChange={e => updateField('check_in', e.target.value)} />
        </div>
        <div>
          <Label>تسجيل الخروج *</Label>
          <Input type="date" value={formData.check_out || ''} onChange={e => updateField('check_out', e.target.value)} />
        </div>
        <div>
          <Label>عدد الليالي</Label>
          <Input type="number" value={formData.nights || ''} readOnly className="bg-muted/50" />
        </div>
      </div>

      {/* البالغين والأطفال */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>عدد البالغين</Label>
          <Input type="number" min={1} value={formData.adults || 2} onChange={e => updateField('adults', Number(e.target.value))} />
        </div>
        <div>
          <Label>عدد الأطفال</Label>
          <Input type="number" min={0} value={formData.children || 0} onChange={e => updateField('children', Number(e.target.value))} />
        </div>
        {Number(formData.children) > 0 && (
          <div>
            <Label>أعمار الأطفال</Label>
            <Input value={formData.children_ages || ''} onChange={e => updateField('children_ages', e.target.value)} placeholder="مثال: 5, 8" />
          </div>
        )}
      </div>

      {/* نظام الوجبات + مرجع الحجز */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>نظام الوجبات</Label>
          <Select value={formData.meal_plan || ''} onValueChange={v => updateField('meal_plan', v)}>
            <SelectTrigger><SelectValue placeholder="اختر نظام الوجبات" /></SelectTrigger>
            <SelectContent>
              {MEAL_PLANS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>مرجع حجز المورد</Label>
          <Input value={formData.booking_reference || ''} onChange={e => updateField('booking_reference', e.target.value)} placeholder="رقم الحجز عند المورد" />
        </div>
      </div>

      {/* سعر الليلة (تكلفة + بيع) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>تكلفة الليلة</Label>
          <Input type="number" value={formData.cost_per_night || ''} onChange={e => updateField('cost_per_night', e.target.value)} placeholder="0" />
        </div>
        <div>
          <Label>سعر بيع الليلة</Label>
          <Input type="number" value={formData.selling_per_night || ''} onChange={e => updateField('selling_per_night', e.target.value)} placeholder="0" />
        </div>
      </div>

      {/* سياسة الإلغاء */}
      <div>
        <Label>سياسة الإلغاء</Label>
        <Textarea value={formData.cancellation_policy || ''} onChange={e => updateField('cancellation_policy', e.target.value)} placeholder="سياسة الإلغاء والتعديل" rows={2} />
      </div>
    </div>
  );
};

export default UnifiedHotelFields;
