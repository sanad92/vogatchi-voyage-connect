
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewHotelBooking } from "@/types/hotelBooking";

interface HotelInfoSectionProps {
  register: UseFormRegister<NewHotelBooking>;
  setValue: UseFormSetValue<NewHotelBooking>;
  errors: FieldErrors<NewHotelBooking>;
  numberOfNights: number;
}

const HotelInfoSection = ({ register, setValue, errors, numberOfNights }: HotelInfoSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>معلومات الفندق</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="hotel_name">اسم الفندق *</Label>
          <Input 
            id="hotel_name"
            {...register('hotel_name', { required: 'اسم الفندق مطلوب' })}
          />
          {errors.hotel_name && <p className="text-red-500 text-sm">{errors.hotel_name.message}</p>}
        </div>

        <div>
          <Label htmlFor="hotel_star_rating">تصنيف الفندق (نجوم)</Label>
          <Select onValueChange={(value) => setValue('hotel_star_rating', parseInt(value))}>
            <SelectTrigger>
              <SelectValue placeholder="اختر التصنيف" />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map(rating => (
                <SelectItem key={rating} value={rating.toString()}>
                  {rating} نجوم
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="destination_city">المدينة *</Label>
          <Input 
            id="destination_city"
            {...register('destination_city', { required: 'المدينة مطلوبة' })}
          />
          {errors.destination_city && <p className="text-red-500 text-sm">{errors.destination_city.message}</p>}
        </div>

        <div>
          <Label htmlFor="check_in_date">تاريخ الوصول *</Label>
          <Input 
            id="check_in_date"
            type="date"
            {...register('check_in_date', { required: 'تاريخ الوصول مطلوب' })}
          />
          {errors.check_in_date && <p className="text-red-500 text-sm">{errors.check_in_date.message}</p>}
        </div>

        <div>
          <Label htmlFor="check_out_date">تاريخ المغادرة *</Label>
          <Input 
            id="check_out_date"
            type="date"
            {...register('check_out_date', { required: 'تاريخ المغادرة مطلوب' })}
          />
          {errors.check_out_date && <p className="text-red-500 text-sm">{errors.check_out_date.message}</p>}
        </div>

        <div>
          <Label>عدد الليالي</Label>
          <Input value={numberOfNights} disabled />
        </div>
      </CardContent>
    </Card>
  );
};

export default HotelInfoSection;
