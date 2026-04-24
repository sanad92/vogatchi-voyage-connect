import { UseFormRegister, UseFormSetValue, UseFormWatch, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NewHotelBooking, BOOKING_SOURCE_OPTIONS } from "@/types/hotelBooking";

interface AdvancedSectionProps {
  register: UseFormRegister<NewHotelBooking>;
  setValue: UseFormSetValue<NewHotelBooking>;
  watch: UseFormWatch<NewHotelBooking>;
  errors: FieldErrors<NewHotelBooking>;
}

const AdvancedSection = ({ register, setValue, watch }: AdvancedSectionProps) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-1.5">
      <Label htmlFor="booking_source">مصدر الحجز</Label>
      <Select value={watch('booking_source') || ''} onValueChange={(v) => setValue('booking_source', v)}>
        <SelectTrigger><SelectValue placeholder="من أين أتى الحجز؟" /></SelectTrigger>
        <SelectContent>
          {BOOKING_SOURCE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
    <div className="space-y-1.5">
      <Label htmlFor="booking_reference_supplier">مرجع الحجز لدى المورد</Label>
      <Input id="booking_reference_supplier" {...register('booking_reference_supplier')} />
    </div>
    <div className="md:col-span-2 space-y-1.5">
      <Label htmlFor="cancellation_policy">سياسة الإلغاء</Label>
      <Textarea id="cancellation_policy" rows={2} {...register('cancellation_policy')} />
    </div>
    <div className="md:col-span-2 space-y-1.5">
      <Label htmlFor="internal_notes">ملاحظات داخلية (لا تظهر للعميل)</Label>
      <Textarea id="internal_notes" rows={3} {...register('internal_notes')}
        placeholder="أي ملاحظات للفريق الداخلي..." />
    </div>
  </div>
);

export default AdvancedSection;
