
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCustomers } from '@/hooks/useCustomers';
import { useTransportBookings } from '@/hooks/useTransportBookings';
import SearchableSelect from '@/components/ui/SearchableSelect';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';

const transportBookingSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().min(1, 'اسم العميل مطلوب'),
  supplier_name: z.string().min(1, 'اسم المورد مطلوب'),
  departure_date: z.string().min(1, 'تاريخ المغادرة مطلوب'),
  departure_time: z.string().optional(),
  pickup_location: z.string().min(1, 'موقع الانطلاق مطلوب'),
  dropoff_location: z.string().min(1, 'موقع الوصول مطلوب'),
  number_of_passengers: z.number().min(1, 'عدد الركاب مطلوب'),
  cost_per_trip: z.number().min(0, 'تكلفة الرحلة مطلوبة'),
  selling_price_per_trip: z.number().min(0, 'سعر البيع مطلوب'),
  supplier_cost: z.number().min(0, 'تكلفة المورد مطلوبة'),
  booking_agent_name: z.string().min(1, 'اسم وكيل الحجز مطلوب'),
  currency: z.string().default('EGP'),
  payment_method: z.string().optional(),
  special_requests: z.string().optional(),
  driver_name: z.string().optional(),
  driver_phone: z.string().optional(),
  vehicle_plate_number: z.string().optional(),
});

type TransportBookingFormData = z.infer<typeof transportBookingSchema>;

interface TransportBookingFormProps {
  onSuccess?: () => void;
}

const TransportBookingForm = ({ onSuccess }: TransportBookingFormProps) => {
  const { customers, customersLoading } = useCustomers();
  const { vehicleTypes, transportRoutes, addTransportBooking, isAddingBooking } = useTransportBookings();
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');
  const [selectedRoute, setSelectedRoute] = useState<string>('');

  const form = useForm<TransportBookingFormData>({
    resolver: zodResolver(transportBookingSchema),
    defaultValues: {
      currency: 'EGP',
      number_of_passengers: 1,
      cost_per_trip: 0,
      selling_price_per_trip: 0,
      supplier_cost: 0,
    },
  });

  const handleSubmit = (data: TransportBookingFormData) => {
    addTransportBooking({
      ...data,
      customer_id: selectedCustomer || undefined,
      vehicle_type_id: selectedVehicleType || undefined,
      route_id: selectedRoute || undefined,
      total_cost: data.selling_price_per_trip * data.number_of_passengers,
      paid_amount: 0,
      exchange_rate_to_egp: 1.00,
      invoice_sent: false,
      voucher_sent: false,
      supplier_payment_sent: false,
    });

    if (onSuccess) {
      onSuccess();
    }
  };

  const customerOptions = customers?.map(customer => ({
    value: customer.id,
    label: `${customer.name} - ${customer.phone}`,
  })) || [];

  const vehicleTypeOptions = vehicleTypes?.map(type => ({
    value: type.id,
    label: `${type.name_ar} (${type.capacity_passengers} راكب)`,
  })) || [];

  const routeOptions = transportRoutes?.map(route => ({
    value: route.id,
    label: `${route.route_name_ar} (${route.departure_city} → ${route.arrival_city})`,
  })) || [];

  const watchedValues = form.watch();
  const totalCost = watchedValues.selling_price_per_trip * watchedValues.number_of_passengers;
  const totalProfit = totalCost - watchedValues.supplier_cost;

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* معلومات العميل */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات العميل</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>العميل</Label>
              <SearchableSelect
                options={customerOptions}
                value={selectedCustomer}
                onValueChange={(value) => {
                  setSelectedCustomer(value);
                  const customer = customers?.find(c => c.id === value);
                  if (customer) {
                    form.setValue('customer_name', customer.name);
                  }
                }}
                placeholder="اختر العميل أو ابحث..."
                emptyText="لا توجد عملاء"
                loading={customersLoading}
              />
            </div>
            <div>
              <Label htmlFor="customer_name">اسم العميل *</Label>
              <Input 
                id="customer_name" 
                {...form.register('customer_name')}
                placeholder="أدخل اسم العميل"
              />
              {form.formState.errors.customer_name && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.customer_name.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* معلومات المورد */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات المورد</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="supplier_name">اسم المورد *</Label>
              <Input 
                id="supplier_name" 
                {...form.register('supplier_name')}
                placeholder="أدخل اسم المورد"
              />
              {form.formState.errors.supplier_name && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.supplier_name.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* تفاصيل الرحلة */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الرحلة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>نوع المركبة</Label>
              <SearchableSelect
                options={vehicleTypeOptions}
                value={selectedVehicleType}
                onValueChange={setSelectedVehicleType}
                placeholder="اختر نوع المركبة..."
                emptyText="لا توجد مركبات"
              />
            </div>
            <div>
              <Label>المسار</Label>
              <SearchableSelect
                options={routeOptions}
                value={selectedRoute}
                onValueChange={setSelectedRoute}
                placeholder="اختر المسار..."
                emptyText="لا توجد مسارات"
              />
            </div>
            <div>
              <Label htmlFor="number_of_passengers">عدد الركاب *</Label>
              <Input 
                id="number_of_passengers" 
                type="number"
                min="1"
                {...form.register('number_of_passengers', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="departure_date">تاريخ المغادرة *</Label>
              <Input 
                id="departure_date" 
                type="date"
                {...form.register('departure_date')}
              />
              {form.formState.errors.departure_date && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.departure_date.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="departure_time">وقت المغادرة</Label>
              <Input 
                id="departure_time" 
                type="time"
                {...form.register('departure_time')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickup_location">موقع الانطلاق *</Label>
              <Input 
                id="pickup_location" 
                {...form.register('pickup_location')}
                placeholder="أدخل موقع الانطلاق"
              />
              {form.formState.errors.pickup_location && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.pickup_location.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="dropoff_location">موقع الوصول *</Label>
              <Input 
                id="dropoff_location" 
                {...form.register('dropoff_location')}
                placeholder="أدخل موقع الوصول"
              />
              {form.formState.errors.dropoff_location && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.dropoff_location.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* التكاليف والأسعار */}
      <Card>
        <CardHeader>
          <CardTitle>التكاليف والأسعار</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="selling_price_per_trip">سعر البيع للرحلة *</Label>
              <Input 
                id="selling_price_per_trip" 
                type="number"
                step="0.01"
                min="0"
                {...form.register('selling_price_per_trip', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="supplier_cost">تكلفة المورد *</Label>
              <Input 
                id="supplier_cost" 
                type="number"
                step="0.01"
                min="0"
                {...form.register('supplier_cost', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="currency">العملة</Label>
              <Select value={form.watch('currency')} onValueChange={(value) => form.setValue('currency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">جنيه مصري</SelectItem>
                  <SelectItem value="USD">دولار أمريكي</SelectItem>
                  <SelectItem value="EUR">يورو</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* عرض الحسابات */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">التكلفة الإجمالية:</span>
                <div className="text-lg font-bold text-green-600">
                  <MultiCurrencyDisplay amount={totalCost} currency={form.watch('currency')} />
                </div>
              </div>
              <div>
                <span className="font-medium">تكلفة المورد:</span>
                <div className="text-lg text-red-600">
                  <MultiCurrencyDisplay amount={watchedValues.supplier_cost} currency={form.watch('currency')} />
                </div>
              </div>
              <div>
                <span className="font-medium">الربح المتوقع:</span>
                <div className={`text-lg font-bold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  <MultiCurrencyDisplay amount={totalProfit} currency={form.watch('currency')} />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات إضافية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="driver_name">اسم السائق</Label>
              <Input 
                id="driver_name" 
                {...form.register('driver_name')}
                placeholder="أدخل اسم السائق"
              />
            </div>
            <div>
              <Label htmlFor="driver_phone">هاتف السائق</Label>
              <Input 
                id="driver_phone" 
                {...form.register('driver_phone')}
                placeholder="أدخل هاتف السائق"
              />
            </div>
            <div>
              <Label htmlFor="vehicle_plate_number">رقم لوحة السيارة</Label>
              <Input 
                id="vehicle_plate_number" 
                {...form.register('vehicle_plate_number')}
                placeholder="أدخل رقم اللوحة"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="booking_agent_name">اسم وكيل الحجز *</Label>
              <Input 
                id="booking_agent_name" 
                {...form.register('booking_agent_name')}
                placeholder="أدخل اسم وكيل الحجز"
              />
              {form.formState.errors.booking_agent_name && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.booking_agent_name.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="payment_method">طريقة الدفع</Label>
              <Select value={form.watch('payment_method')} onValueChange={(value) => form.setValue('payment_method', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                  <SelectItem value="installment">أقساط</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="special_requests">طلبات خاصة</Label>
            <Textarea 
              id="special_requests" 
              {...form.register('special_requests')}
              placeholder="أدخل أي طلبات خاصة..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button type="submit" disabled={isAddingBooking}>
          {isAddingBooking ? 'جاري الحفظ...' : 'حفظ الحجز'}
        </Button>
      </div>
    </form>
  );
};

export default TransportBookingForm;
