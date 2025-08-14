
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewHotelBooking, MealPlan } from "@/types/hotelBooking";

interface RoomDetailsSectionProps {
  register: UseFormRegister<NewHotelBooking>;
  setValue: UseFormSetValue<NewHotelBooking>;
  errors: FieldErrors<NewHotelBooking>;
}

const RoomDetailsSection = ({ register, setValue, errors }: RoomDetailsSectionProps) => {
  const mealPlans: { value: MealPlan; label: string }[] = [
    { value: 'RO', label: 'Room Only (RO)' },
    { value: 'BB', label: 'Bed & Breakfast (BB)' },
    { value: 'HB', label: 'Half Board (HB)' },
    { value: 'FB', label: 'Full Board (FB)' },
    { value: 'ALL', label: 'All Inclusive (ALL)' },
    { value: 'UAI', label: 'Ultra All Inclusive (UAI)' },
    { value: 'SAL', label: 'Soft All Inclusive (SAL)' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>تفاصيل الغرفة والإقامة</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="room_type">نوع الغرفة *</Label>
          <Input 
            id="room_type"
            {...register('room_type', { required: 'نوع الغرفة مطلوب' })}
            placeholder="Single/Double/Triple/Family..."
          />
          {errors.room_type && <p className="text-red-500 text-sm">{errors.room_type.message}</p>}
        </div>

        <div>
          <Label htmlFor="adults">عدد البالغين *</Label>
          <Input 
            id="adults"
            type="number"
            min="1"
            {...register('adults', { required: 'عدد البالغين مطلوب', min: 1 })}
          />
          {errors.adults && <p className="text-red-500 text-sm">{errors.adults.message}</p>}
        </div>

        <div>
          <Label htmlFor="children">عدد الأطفال</Label>
          <Input 
            id="children"
            type="number"
            min="0"
            {...register('children')}
          />
        </div>

        <div>
          <Label htmlFor="children_ages">أعمار الأطفال</Label>
          <Input 
            id="children_ages"
            {...register('children_ages')}
            placeholder="مثال: 5, 8, 12"
          />
        </div>

        <div>
          <Label htmlFor="meal_plan">نظام الوجبات *</Label>
          <Select onValueChange={(value) => setValue('meal_plan', value as MealPlan)}>
            <SelectTrigger>
              <SelectValue placeholder="اختر نظام الوجبات" />
            </SelectTrigger>
            <SelectContent>
              {mealPlans.map(plan => (
                <SelectItem key={plan.value} value={plan.value}>
                  {plan.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="booking_reference_supplier">مرجع الحجز لدى المورد</Label>
          <Input 
            id="booking_reference_supplier"
            {...register('booking_reference_supplier')}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="cancellation_policy">سياسة الإلغاء</Label>
          <Textarea 
            id="cancellation_policy"
            {...register('cancellation_policy')}
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default RoomDetailsSection;
