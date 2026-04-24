import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewHotelBooking, MealPlan, ROOM_TYPE_OPTIONS } from "@/types/hotelBooking";

interface RoomDetailsSectionProps {
  register: UseFormRegister<NewHotelBooking>;
  setValue: UseFormSetValue<NewHotelBooking>;
  watch: UseFormWatch<NewHotelBooking>;
  errors: FieldErrors<NewHotelBooking>;
}

const mealPlans: { value: MealPlan; label: string }[] = [
  { value: 'RO', label: 'بدون وجبات (RO)' },
  { value: 'BB', label: 'إفطار (BB)' },
  { value: 'HB', label: 'نصف إقامة (HB)' },
  { value: 'FB', label: 'إقامة كاملة (FB)' },
  { value: 'ALL', label: 'شامل كل شيء (ALL)' },
  { value: 'UAI', label: 'فاخر شامل (UAI)' },
  { value: 'SAL', label: 'شامل خفيف (SAL)' },
];

const RoomDetailsSection = ({ register, setValue, watch, errors }: RoomDetailsSectionProps) => {
  const roomType = watch('room_type');
  const isStandardRoomType = ROOM_TYPE_OPTIONS.includes(roomType);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="room_type">نوع الغرفة *</Label>
        <Select
          value={isStandardRoomType ? roomType : ''}
          onValueChange={(v) => setValue('room_type', v, { shouldValidate: true })}
        >
          <SelectTrigger><SelectValue placeholder="اختر نوع الغرفة" /></SelectTrigger>
          <SelectContent>
            {ROOM_TYPE_OPTIONS.map(rt => (
              <SelectItem key={rt} value={rt}>{rt}</SelectItem>
            ))}
            <SelectItem value="__custom__">+ نوع آخر (نص حر)</SelectItem>
          </SelectContent>
        </Select>
        {(roomType === '__custom__' || (!isStandardRoomType && roomType)) && (
          <Input
            placeholder="اكتب نوع الغرفة..."
            {...register('room_type', { required: 'نوع الغرفة مطلوب' })}
          />
        )}
        {errors.room_type && <p className="text-destructive text-xs">{errors.room_type.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="meal_plan">نظام الوجبات *</Label>
        <Select
          value={watch('meal_plan') || ''}
          onValueChange={(v) => setValue('meal_plan', v as MealPlan, { shouldValidate: true })}
        >
          <SelectTrigger><SelectValue placeholder="اختر نظام الوجبات" /></SelectTrigger>
          <SelectContent>
            {mealPlans.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="number_of_rooms">عدد الغرف *</Label>
        <Input
          id="number_of_rooms"
          type="number"
          min="1"
          defaultValue={1}
          {...register('number_of_rooms', { required: true, min: 1, valueAsNumber: true })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="adults">عدد البالغين *</Label>
        <Input
          id="adults"
          type="number"
          min="1"
          defaultValue={2}
          {...register('adults', { required: 'عدد البالغين مطلوب', min: 1, valueAsNumber: true })}
        />
        {errors.adults && <p className="text-destructive text-xs">{errors.adults.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="children">عدد الأطفال</Label>
        <Input
          id="children"
          type="number"
          min="0"
          defaultValue={0}
          {...register('children', { valueAsNumber: true })}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="children_ages">أعمار الأطفال</Label>
        <Input
          id="children_ages"
          {...register('children_ages')}
          placeholder="مثال: 5, 8, 12"
        />
      </div>
    </div>
  );
};

export default RoomDetailsSection;
