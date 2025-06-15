
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { useCustomers } from '@/hooks/useCustomers';
import { useTransportBookings } from '@/hooks/useTransportBookings';
import { useExpenses } from '@/hooks/useExpenses';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';
import { toast } from 'sonner';

interface TransportBookingFormProps {
  onSuccess: () => void;
}

const TransportBookingForm = ({ onSuccess }: TransportBookingFormProps) => {
  const { customers, isLoading: customersLoading } = useCustomers();
  const { employees } = useExpenses();
  const { 
    vehicleTypes, 
    transportRoutes, 
    addTransportBooking, 
    isAddingBooking 
  } = useTransportBookings();

  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    supplier_name: '',
    route_id: '',
    vehicle_type_id: '',
    booking_agent_id: '',
    departure_date: '',
    departure_time: '',
    arrival_date: '',
    arrival_time: '',
    pickup_location: '',
    dropoff_location: '',
    number_of_passengers: 1,
    currency: 'EGP' as const,
    cost_per_trip: 0,
    selling_price_per_trip: 0,
    supplier_cost: 0,
    paid_amount: 0,
    payment_method: '',
    booking_agent_name: '',
    special_requests: '',
    driver_name: '',
    driver_phone: '',
    vehicle_plate_number: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const bookingData = {
      ...formData,
      total_cost: formData.selling_price_per_trip * formData.number_of_passengers,
      exchange_rate_to_egp: 1.00,
      invoice_sent: false,
      voucher_sent: false,
      supplier_payment_sent: false,
      currency: formData.currency as string
    };

    addTransportBooking(bookingData);
    onSuccess();
  };

  const customerOptions = customers?.map(customer => ({
    value: customer.id,
    label: `${customer.name} - ${customer.phone}`
  })) || [];

  const routeOptions = transportRoutes?.map(route => ({
    value: route.id,
    label: `${route.route_name} (${route.departure_city} - ${route.arrival_city})`
  })) || [];

  const vehicleTypeOptions = vehicleTypes?.map(type => ({
    value: type.id,
    label: `${type.name} - ${type.capacity_passengers} راكب`
  })) || [];

  const employeeOptions = employees?.map(employee => ({
    value: employee.id,
    label: `${employee.full_name} - ${employee.employee_code}`
  })) || [];

  const handleCustomerSelect = (customerId: string) => {
    const customer = customers?.find(c => c.id === customerId);
    if (customer) {
      setFormData(prev => ({
        ...prev,
        customer_id: customerId,
        customer_name: customer.name
      }));
    }
  };

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees?.find(e => e.id === employeeId);
    if (employee) {
      setFormData(prev => ({
        ...prev,
        booking_agent_id: employeeId,
        booking_agent_name: employee.full_name
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* معلومات العميل والموظف */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات العميل والموظف المسؤول</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>العميل *</Label>
              <SearchableSelect
                options={customerOptions}
                value={formData.customer_id}
                onChange={handleCustomerSelect}
                placeholder="اختر عميل"
                emptyText="لا توجد عملاء"
                loading={customersLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>اسم العميل</Label>
              <Input
                value={formData.customer_name}
                onChange={(e) => setFormData(prev => ({ ...prev, customer_name: e.target.value }))}
                placeholder="اسم العميل"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>الموظف المسؤول *</Label>
              <SearchableSelect
                options={employeeOptions}
                value={formData.booking_agent_id}
                onChange={handleEmployeeSelect}
                placeholder="اختر موظف"
                emptyText="لا توجد موظفين"
              />
            </div>

            <div className="space-y-2">
              <Label>اسم المورد *</Label>
              <Input
                value={formData.supplier_name}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_name: e.target.value }))}
                placeholder="اسم المورد"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* تفاصيل الرحلة */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الرحلة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>الطريق</Label>
              <SearchableSelect
                options={routeOptions}
                value={formData.route_id}
                onChange={(value) => setFormData(prev => ({ ...prev, route_id: value }))}
                placeholder="اختر طريق"
                emptyText="لا توجد طرق"
              />
            </div>

            <div className="space-y-2">
              <Label>نوع المركبة</Label>
              <SearchableSelect
                options={vehicleTypeOptions}
                value={formData.vehicle_type_id}
                onChange={(value) => setFormData(prev => ({ ...prev, vehicle_type_id: value }))}
                placeholder="اختر نوع المركبة"
                emptyText="لا توجد أنواع مركبات"
              />
            </div>

            <div className="space-y-2">
              <Label>تاريخ المغادرة *</Label>
              <Input
                type="date"
                value={formData.departure_date}
                onChange={(e) => setFormData(prev => ({ ...prev, departure_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>وقت المغادرة</Label>
              <Input
                type="time"
                value={formData.departure_time}
                onChange={(e) => setFormData(prev => ({ ...prev, departure_time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>تاريخ الوصول</Label>
              <Input
                type="date"
                value={formData.arrival_date}
                onChange={(e) => setFormData(prev => ({ ...prev, arrival_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>وقت الوصول</Label>
              <Input
                type="time"
                value={formData.arrival_time}
                onChange={(e) => setFormData(prev => ({ ...prev, arrival_time: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>مكان الاستلام *</Label>
              <Input
                value={formData.pickup_location}
                onChange={(e) => setFormData(prev => ({ ...prev, pickup_location: e.target.value }))}
                placeholder="مكان الاستلام"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>مكان التسليم *</Label>
              <Input
                value={formData.dropoff_location}
                onChange={(e) => setFormData(prev => ({ ...prev, dropoff_location: e.target.value }))}
                placeholder="مكان التسليم"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>عدد الركاب *</Label>
              <Input
                type="number"
                min="1"
                value={formData.number_of_passengers}
                onChange={(e) => setFormData(prev => ({ ...prev, number_of_passengers: parseInt(e.target.value) || 1 }))}
                required
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>العملة *</Label>
              <Select value={formData.currency} onValueChange={(value: any) => setFormData(prev => ({ ...prev, currency: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">جنيه مصري (EGP)</SelectItem>
                  <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                  <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>تكلفة الرحلة الواحدة *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.cost_per_trip}
                onChange={(e) => setFormData(prev => ({ ...prev, cost_per_trip: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>سعر البيع للرحلة الواحدة *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.selling_price_per_trip}
                onChange={(e) => setFormData(prev => ({ ...prev, selling_price_per_trip: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>تكلفة المورد *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.supplier_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_cost: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>المبلغ المدفوع</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.paid_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, paid_amount: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <Input
                value={formData.payment_method}
                onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                placeholder="طريقة الدفع"
              />
            </div>
          </div>

          {/* ملخص التكاليف */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3">ملخص التكاليف:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">إجمالي السعر:</span>
                <div className="font-semibold">
                  <MultiCurrencyDisplay 
                    amount={formData.selling_price_per_trip * formData.number_of_passengers} 
                    currency={formData.currency as any} 
                    showInEGP={false} 
                  />
                </div>
              </div>
              <div>
                <span className="text-gray-600">إجمالي التكلفة:</span>
                <div className="font-semibold">
                  <MultiCurrencyDisplay 
                    amount={formData.supplier_cost} 
                    currency={formData.currency as any} 
                    showInEGP={false} 
                  />
                </div>
              </div>
              <div>
                <span className="text-gray-600">الربح المتوقع:</span>
                <div className="font-semibold text-green-600">
                  <MultiCurrencyDisplay 
                    amount={(formData.selling_price_per_trip * formData.number_of_passengers) - formData.supplier_cost} 
                    currency={formData.currency as any} 
                    showInEGP={false} 
                  />
                </div>
              </div>
              <div>
                <span className="text-gray-600">المبلغ المتبقي:</span>
                <div className="font-semibold text-orange-600">
                  <MultiCurrencyDisplay 
                    amount={(formData.selling_price_per_trip * formData.number_of_passengers) - formData.paid_amount} 
                    currency={formData.currency as any} 
                    showInEGP={false} 
                  />
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
            <div className="space-y-2">
              <Label>اسم السائق</Label>
              <Input
                value={formData.driver_name}
                onChange={(e) => setFormData(prev => ({ ...prev, driver_name: e.target.value }))}
                placeholder="اسم السائق"
              />
            </div>

            <div className="space-y-2">
              <Label>هاتف السائق</Label>
              <Input
                value={formData.driver_phone}
                onChange={(e) => setFormData(prev => ({ ...prev, driver_phone: e.target.value }))}
                placeholder="هاتف السائق"
              />
            </div>

            <div className="space-y-2">
              <Label>رقم لوحة المركبة</Label>
              <Input
                value={formData.vehicle_plate_number}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_plate_number: e.target.value }))}
                placeholder="رقم لوحة المركبة"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>طلبات خاصة</Label>
            <Textarea
              value={formData.special_requests}
              onChange={(e) => setFormData(prev => ({ ...prev, special_requests: e.target.value }))}
              placeholder="أي طلبات خاصة أو ملاحظات"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* أزرار العمليات */}
      <div className="flex gap-2 justify-end">
        <Button 
          type="submit" 
          disabled={isAddingBooking}
          className="min-w-32"
        >
          {isAddingBooking ? 'جاري الحفظ...' : 'حفظ الحجز'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          onClick={onSuccess}
        >
          إلغاء
        </Button>
      </div>
    </form>
  );
};

export default TransportBookingForm;
