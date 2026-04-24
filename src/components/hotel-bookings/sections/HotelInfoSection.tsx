import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewHotelBooking, ROOM_VIEW_OPTIONS } from "@/types/hotelBooking";
import HotelCombobox from "../HotelCombobox";
import BookingDateRangePicker from "../BookingDateRangePicker";
import { supabase } from "@/integrations/supabase/client";
import { useOrgId } from "@/hooks/useOrgId";
import { useState, useEffect, useRef } from "react";

interface HotelInfoSectionProps {
  register: UseFormRegister<NewHotelBooking>;
  setValue: UseFormSetValue<NewHotelBooking>;
  watch: UseFormWatch<NewHotelBooking>;
  errors: FieldErrors<NewHotelBooking>;
}

const HotelInfoSection = ({ register, setValue, watch, errors }: HotelInfoSectionProps) => {
  const orgId = useOrgId();
  const hotelName = watch('hotel_name');
  const hotelId = watch('hotel_id');
  const checkIn = watch('check_in_date');
  const checkOut = watch('check_out_date');
  const city = watch('destination_city');

  // Suggest cities from past bookings
  const { data: cityList = [] } = useQuery({
    queryKey: ['hotel-cities', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data } = await supabase
        .from('hotel_bookings')
        .select('destination_city')
        .eq('organization_id', orgId!)
        .not('destination_city', 'is', null)
        .order('created_at', { ascending: false })
        .limit(100);
      return Array.from(new Set((data || []).map(r => r.destination_city).filter(Boolean) as string[]));
    },
  });

  // Register hidden fields for hotel_name + dates
  // (DateRangePicker manages dates via setValue)
  // Register hotel_name with required validation manually triggered by combobox
  useEffect(() => {
    register('hotel_name', { required: 'اسم الفندق مطلوب' });
    register('check_in_date', { required: 'تاريخ الوصول مطلوب' });
    register('check_out_date', { required: 'تاريخ المغادرة مطلوب' });
    register('destination_city', { required: 'المدينة مطلوبة' });
  }, [register]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="md:col-span-2 space-y-1.5">
        <Label>الفندق *</Label>
        <HotelCombobox
          value={hotelName}
          hotelId={hotelId}
          onSelect={(h) => {
            setValue('hotel_name', h.name, { shouldValidate: true });
            setValue('hotel_id', h.id || undefined, { shouldValidate: true });
            if (h.star_rating) setValue('hotel_star_rating', h.star_rating);
          }}
        />
        {errors.hotel_name && <p className="text-destructive text-xs">{errors.hotel_name.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="destination_city">المدينة *</Label>
        <Input
          id="destination_city"
          list="city-suggestions"
          value={city || ''}
          onChange={(e) => setValue('destination_city', e.target.value, { shouldValidate: true })}
          placeholder="مثال: القاهرة، الغردقة..."
        />
        <datalist id="city-suggestions">
          {cityList.map(c => <option key={c} value={c} />)}
        </datalist>
        {errors.destination_city && <p className="text-destructive text-xs">{errors.destination_city.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="hotel_star_rating">تصنيف الفندق</Label>
        <Select
          value={watch('hotel_star_rating')?.toString() || ''}
          onValueChange={(v) => setValue('hotel_star_rating', parseInt(v))}
        >
          <SelectTrigger><SelectValue placeholder="اختر التصنيف" /></SelectTrigger>
          <SelectContent>
            {[1, 2, 3, 4, 5].map(r => (
              <SelectItem key={r} value={r.toString()}>{'⭐'.repeat(r)} ({r})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="md:col-span-2 space-y-1.5">
        <Label>تواريخ الإقامة *</Label>
        <BookingDateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(r) => {
            setValue('check_in_date', r.checkIn || '', { shouldValidate: true });
            setValue('check_out_date', r.checkOut || '', { shouldValidate: true });
          }}
        />
        {(errors.check_in_date || errors.check_out_date) && (
          <p className="text-destructive text-xs">{errors.check_in_date?.message || errors.check_out_date?.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="room_view">إطلالة الغرفة</Label>
        <Select
          value={watch('room_view') || ''}
          onValueChange={(v) => setValue('room_view', v)}
        >
          <SelectTrigger><SelectValue placeholder="اختر الإطلالة (اختياري)" /></SelectTrigger>
          <SelectContent>
            {ROOM_VIEW_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default HotelInfoSection;
