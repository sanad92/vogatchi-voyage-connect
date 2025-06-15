
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
import { Checkbox } from '@/components/ui/checkbox';
import { useCustomers } from '@/hooks/useCustomers';
import { useCarRentals } from '@/hooks/useCarRentals';
import { useTransportBookings } from '@/hooks/useTransportBookings';
import SearchableSelect from '@/components/ui/SearchableSelect';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';

const carRentalSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().min(1, 'اسم العميل مطلوب'),
  supplier_name: z.string().min(1, 'اسم المورد مطلوب'),
  rental_start_date: z.string().min(1, 'تاريخ بداية الإيجار مطلوب'),
  rental_end_date: z.string().min(1, 'تاريخ نهاية الإيجار مطلوب'),
  pickup_location: z.string().min(1, 'موقع الاستلام مطلوب'),
  return_location: z.string().min(1, 'موقع الإرجاع مطلوب'),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional(),
  vehicle_year: z.number().optional(),
  vehicle_color: z.string().optional(),
  daily_rate: z.number().min(0, 'المعدل اليومي مطلوب'),
  supplier_daily_cost: z.number().min(0, 'تكلفة المورد اليومية مطلوبة'),
  insurance_cost: z.number().default(0),
  additional_fees: z.number().default(0),
  security_deposit: z.number().default(0),
  booking_agent_name: z.string().min(1, 'اسم وكيل الحجز مطلوب'),
  currency: z.string().default('EGP'),
  driver_license_number: z.string().optional(),
  insurance_included: z.boolean().default(true),
  gps_included: z.boolean().default(false),
  additional_driver_count: z.number().default(0),
  special_requirements: z.string().optional(),
});

type CarRentalFormData = z.infer<typeof carRentalSchema>;

interface CarRentalFormProps {
  onSuccess?: () => void;
}

const CarRentalForm = ({ onSuccess }: CarRentalFormProps) => {
  const { customers, customersLoading } = useCustomers();
  const { vehicleTypes } = useTransportBookings();
  const { addCarRental, isAddingRental } = useCarRentals();
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [selectedVehicleType, setSelectedVehicleType] = useState<string>('');

  const form = useForm<CarRentalFormData>({
    resolver: zodResolver(carRentalSchema),
    defaultValues: {
      currency: 'EGP',
      daily_rate: 0,
      supplier_daily_cost: 0,
      insurance_cost: 0,
      additional_fees: 0,
      security_deposit: 0,
      insurance_included: true,
      gps_included: false,
      additional_driver_count: 0,
    },
  });

  const handleSubmit = (data: CarRentalFormData) => {
    const startDate = new Date(data.rental_start_date);
    const endDate = new Date(data.rental_end_date);
    const rentalDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    addCarRental({
      ...data,
      customer_id: selectedCustomer || undefined,
      vehicle_type_id: selectedVehicleType || undefined,
      rental_duration_days: rentalDurationDays,
      total_rental_cost: data.daily_rate * rentalDurationDays,
      supplier_total_cost: data.supplier_daily_cost * rentalDurationDays,
      vehicle_plate_number: '',
      fuel_level_pickup: 'full',
      paid_amount: 0,
      deposit_paid: 0,
      deposit_returned: 0,
      exchange_rate_to_egp: 1.00,
      contract_sent: false,
      invoice_sent: false,
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

  const watchedValues = form.watch();
  const startDate = new Date(watchedValues.rental_start_date || '');
  const endDate = new Date(watchedValues.rental_end_date || '');
  const rentalDays = watchedValues.rental_start_date && watchedValues.rental_end_date 
    ? Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1 
    : 0;
  
  const totalRentalCost = watchedValues.daily_rate * rentalDays;
  const supplierTotalCost = watchedValues.supplier_daily_cost * rentalDays;
  const totalCost = totalRentalCost + watchedValues.insurance_cost + watchedValues.additional_fees;
  const totalProfit = totalRentalCost - supplierTotalCost - watchedValues.insurance_cost - watchedValues.additional_fees;

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
            <div>
              <Label htmlFor="driver_license_number">رقم رخصة القيادة</Label>
              <Input 
                id="driver_license_number" 
                {...form.register('driver_license_number')}
                placeholder="أدخل رقم رخصة القيادة"
              />
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

      {/* تفاصيل الإيجار */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الإيجار</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="rental_start_date">تاريخ بداية الإيجار *</Label>
              <Input 
                id="rental_start_date" 
                type="date"
                {...form.register('rental_start_date')}
              />
              {form.formState.errors.rental_start_date && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.rental_start_date.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="rental_end_date">تاريخ نهاية الإيجار *</Label>
              <Input 
                id="rental_end_date" 
                type="date"
                {...form.register('rental_end_date')}
              />
              {form.formState.errors.rental_end_date && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.rental_end_date.message}</p>
              )}
            </div>
            <div>
              <Label>مدة الإيجار</Label>
              <div className="p-2 bg-gray-100 rounded text-center">
                {rentalDays > 0 ? `${rentalDays} يوم` : '-'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickup_location">موقع الاستلام *</Label>
              <Input 
                id="pickup_location" 
                {...form.register('pickup_location')}
                placeholder="أدخل موقع الاستلام"
              />
              {form.formState.errors.pickup_location && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.pickup_location.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor="return_location">موقع الإرجاع *</Label>
              <Input 
                id="return_location" 
                {...form.register('return_location')}
                placeholder="أدخل موقع الإرجاع"
              />
              {form.formState.errors.return_location && (
                <p className="text-red-500 text-sm mt-1">{form.formState.errors.return_location.message}</p>
              )}
            </div>
          </div>

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
        </CardContent>
      </Card>

      {/* تفاصيل السيارة */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل السيارة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="vehicle_make">الماركة</Label>
              <Input 
                id="vehicle_make" 
                {...form.register('vehicle_make')}
                placeholder="تويوتا، هوندا..."
              />
            </div>
            <div>
              <Label htmlFor="vehicle_model">الموديل</Label>
              <Input 
                id="vehicle_model" 
                {...form.register('vehicle_model')}
                placeholder="كورولا، سيفيك..."
              />
            </div>
            <div>
              <Label htmlFor="vehicle_year">سنة الصنع</Label>
              <Input 
                id="vehicle_year" 
                type="number"
                min="1990"
                max="2030"
                {...form.register('vehicle_year', { valueAsNumber: true })}
                placeholder="2020"
              />
            </div>
            <div>
              <Label htmlFor="vehicle_color">اللون</Label>
              <Input 
                id="vehicle_color" 
                {...form.register('vehicle_color')}
                placeholder="أبيض، أسود..."
              />
            </div>
          </div>

          <div className="flex gap-6">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="insurance_included"
                checked={form.watch('insurance_included')}
                onCheckedChange={(checked) => form.setValue('insurance_included', !!checked)}
              />
              <Label htmlFor="insurance_included">التأمين مشمول</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="gps_included"
                checked={form.watch('gps_included')}
                onCheckedChange={(checked) => form.setValue('gps_included', !!checked)}
              />
              <Label htmlFor="gps_included">نظام GPS</Label>
            </div>
            <div>
              <Label htmlFor="additional_driver_count">سائقين إضافيين</Label>
              <Input 
                id="additional_driver_count" 
                type="number"
                min="0"
                max="5"
                {...form.register('additional_driver_count', { valueAsNumber: true })}
                className="w-20"
              />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="daily_rate">المعدل اليومي *</Label>
              <Input 
                id="daily_rate" 
                type="number"
                step="0.01"
                min="0"
                {...form.register('daily_rate', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="supplier_daily_cost">تكلفة المورد اليومية *</Label>
              <Input 
                id="supplier_daily_cost" 
                type="number"
                step="0.01"
                min="0"
                {...form.register('supplier_daily_cost', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="insurance_cost">تكلفة التأمين</Label>
              <Input 
                id="insurance_cost" 
                type="number"
                step="0.01"
                min="0"
                {...form.register('insurance_cost', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="additional_fees">رسوم إضافية</Label>
              <Input 
                id="additional_fees" 
                type="number"
                step="0.01"
                min="0"
                {...form.register('additional_fees', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="security_deposit">التأمين (العربون)</Label>
              <Input 
                id="security_deposit" 
                type="number"
                step="0.01"
                min="0"
                {...form.register('security_deposit', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="currency">العملة</Label>
            <Select value={form.watch('currency')} onValueChange={(value) => form.setValue('currency', value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EGP">جنيه مصري</SelectItem>
                <SelectItem value="USD">دولار أمريكي</SelectItem>
                <SelectItem value="EUR">يورو</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* عرض الحسابات */}
          {rentalDays > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">إجمالي الإيجار:</span>
                  <div className="text-lg font-bold text-blue-600">
                    <MultiCurrencyDisplay amount={totalRentalCost} currency={form.watch('currency')} />
                  </div>
                </div>
                <div>
                  <span className="font-medium">التكلفة الإجمالية:</span>
                  <div className="text-lg font-bold text-green-600">
                    <MultiCurrencyDisplay amount={totalCost} currency={form.watch('currency')} />
                  </div>
                </div>
                <div>
                  <span className="font-medium">تكلفة المورد:</span>
                  <div className="text-lg text-red-600">
                    <MultiCurrencyDisplay amount={supplierTotalCost} currency={form.watch('currency')} />
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
          )}
        </CardContent>
      </Card>

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات إضافية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
            <Label htmlFor="special_requirements">متطلبات خاصة</Label>
            <Textarea 
              id="special_requirements" 
              {...form.register('special_requirements')}
              placeholder="أدخل أي متطلبات خاصة..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button type="submit" disabled={isAddingRental}>
          {isAddingRental ? 'جاري الحفظ...' : 'حفظ عقد الإيجار'}
        </Button>
      </div>
    </form>
  );
};

export default CarRentalForm;
