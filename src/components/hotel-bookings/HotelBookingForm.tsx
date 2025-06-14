
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { HotelBooking, NewHotelBooking, MealPlan, HotelSupplier } from "@/types/hotelBooking";

interface HotelBookingFormProps {
  booking?: HotelBooking | null;
  onSuccess: () => void;
  onCancel: () => void;
}

const HotelBookingForm = ({ booking, onSuccess, onCancel }: HotelBookingFormProps) => {
  const [suppliers, setSuppliers] = useState<HotelSupplier[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<NewHotelBooking>({
    defaultValues: booking ? {
      customer_name: booking.customer_name,
      booking_agent_name: booking.booking_agent_name,
      hotel_name: booking.hotel_name,
      hotel_star_rating: booking.hotel_star_rating,
      destination_city: booking.destination_city,
      check_in_date: booking.check_in_date,
      check_out_date: booking.check_out_date,
      room_type: booking.room_type,
      number_of_adults: booking.number_of_adults,
      number_of_children: booking.number_of_children,
      children_ages: booking.children_ages,
      meal_plan: booking.meal_plan,
      booking_reference_supplier: booking.booking_reference_supplier,
      cancellation_policy: booking.cancellation_policy,
      supplier_name: booking.supplier_name,
      cost_per_night: booking.cost_per_night,
      selling_price_per_night: booking.selling_price_per_night,
      payment_method: booking.payment_method,
      paid_amount: booking.paid_amount,
      payment_due_date: booking.payment_due_date,
    } : {}
  });

  useEffect(() => {
    const fetchSuppliers = async () => {
      const { data } = await supabase
        .from('hotel_suppliers')
        .select('*')
        .order('name');
      if (data) setSuppliers(data);
    };
    fetchSuppliers();
  }, []);

  const checkInDate = watch('check_in_date');
  const checkOutDate = watch('check_out_date');
  const costPerNight = watch('cost_per_night');
  const sellingPricePerNight = watch('selling_price_per_night');

  // Calculate number of nights and totals
  const numberOfNights = checkInDate && checkOutDate ? 
    Math.max(0, new Date(checkOutDate).getTime() - new Date(checkInDate).getTime()) / (1000 * 60 * 60 * 24) : 0;

  const totalCostCustomer = sellingPricePerNight ? sellingPricePerNight * numberOfNights : 0;
  const totalProfit = (sellingPricePerNight && costPerNight) ? (sellingPricePerNight - costPerNight) * numberOfNights : 0;

  const onSubmit = async (data: NewHotelBooking) => {
    setIsSubmitting(true);
    try {
      if (booking) {
        const { error } = await supabase
          .from('hotel_bookings')
          .update(data)
          .eq('id', booking.id);
        if (error) throw error;
        toast.success('تم تحديث الحجز بنجاح');
      } else {
        const { error } = await supabase
          .from('hotel_bookings')
          .insert([data]);
        if (error) throw error;
        toast.success('تم إنشاء الحجز بنجاح');
      }
      onSuccess();
    } catch (error) {
      console.error('Error saving booking:', error);
      toast.error('حدث خطأ في حفظ الحجز');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Booking Details */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الحجز</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customer_name">اسم العميل *</Label>
            <Input 
              id="customer_name"
              {...register('customer_name', { required: 'اسم العميل مطلوب' })}
            />
            {errors.customer_name && <p className="text-red-500 text-sm">{errors.customer_name.message}</p>}
          </div>
          
          <div>
            <Label htmlFor="booking_agent_name">اسم موظف الحجز *</Label>
            <Input 
              id="booking_agent_name"
              {...register('booking_agent_name', { required: 'اسم موظف الحجز مطلوب' })}
            />
            {errors.booking_agent_name && <p className="text-red-500 text-sm">{errors.booking_agent_name.message}</p>}
          </div>
        </CardContent>
      </Card>

      {/* Hotel Information */}
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

      {/* Room and Stay Details */}
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
            <Label htmlFor="number_of_adults">عدد البالغين *</Label>
            <Input 
              id="number_of_adults"
              type="number"
              min="1"
              {...register('number_of_adults', { required: 'عدد البالغين مطلوب', min: 1 })}
            />
            {errors.number_of_adults && <p className="text-red-500 text-sm">{errors.number_of_adults.message}</p>}
          </div>

          <div>
            <Label htmlFor="number_of_children">عدد الأطفال</Label>
            <Input 
              id="number_of_children"
              type="number"
              min="0"
              {...register('number_of_children')}
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

      {/* Supplier and Cost */}
      <Card>
        <CardHeader>
          <CardTitle>المورد والتكلفة</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="supplier_name">اسم المورد *</Label>
            <Select onValueChange={(value) => setValue('supplier_name', value)}>
              <SelectTrigger>
                <SelectValue placeholder="اختر المورد" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map(supplier => (
                  <SelectItem key={supplier.id} value={supplier.name}>
                    {supplier.name} {supplier.is_direct_hotel && '(مباشر)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="cost_per_night">تكلفة الليلة (مورد) *</Label>
            <Input 
              id="cost_per_night"
              type="number"
              step="0.01"
              {...register('cost_per_night', { required: 'تكلفة الليلة مطلوبة', min: 0 })}
            />
            {errors.cost_per_night && <p className="text-red-500 text-sm">{errors.cost_per_night.message}</p>}
          </div>

          <div>
            <Label htmlFor="selling_price_per_night">سعر البيع لليلة *</Label>
            <Input 
              id="selling_price_per_night"
              type="number"
              step="0.01"
              {...register('selling_price_per_night', { required: 'سعر البيع مطلوب', min: 0 })}
            />
            {errors.selling_price_per_night && <p className="text-red-500 text-sm">{errors.selling_price_per_night.message}</p>}
          </div>

          <div>
            <Label>إجمالي التكلفة للعميل</Label>
            <Input value={totalCostCustomer.toFixed(2)} disabled />
          </div>

          <div>
            <Label>إجمالي الربح</Label>
            <Input value={totalProfit.toFixed(2)} disabled />
          </div>

          <div>
            <Label htmlFor="payment_method">طريقة الدفع</Label>
            <Input 
              id="payment_method"
              {...register('payment_method')}
            />
          </div>

          <div>
            <Label htmlFor="paid_amount">المبلغ المدفوع</Label>
            <Input 
              id="paid_amount"
              type="number"
              step="0.01"
              {...register('paid_amount')}
            />
          </div>

          <div>
            <Label htmlFor="payment_due_date">تاريخ استحقاق الدفع</Label>
            <Input 
              id="payment_due_date"
              type="date"
              {...register('payment_due_date')}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'جاري الحفظ...' : booking ? 'تحديث الحجز' : 'إنشاء الحجز'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          إلغاء
        </Button>
      </div>
    </form>
  );
};

export default HotelBookingForm;
