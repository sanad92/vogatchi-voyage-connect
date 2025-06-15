
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { useCustomers } from '@/hooks/useCustomers';
import { useCarRentals } from '@/hooks/useCarRentals';
import { useExpenses } from '@/hooks/useExpenses';
import { useTransportBookings } from '@/hooks/useTransportBookings';
import MultiCurrencyDisplay from '@/components/currency/MultiCurrencyDisplay';
import { toast } from 'sonner';

interface CarRentalFormProps {
  onSuccess: () => void;
}

const CarRentalForm = ({ onSuccess }: CarRentalFormProps) => {
  const { customers, isLoading: customersLoading } = useCustomers();
  const { employees } = useExpenses();
  const { vehicleTypes } = useTransportBookings();
  const { addCarRental, isAddingRental } = useCarRentals();

  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    supplier_name: '',
    vehicle_type_id: '',
    booking_agent_id: '',
    rental_start_date: '',
    rental_end_date: '',
    pickup_location: '',
    return_location: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    vehicle_plate_number: '',
    vehicle_color: '',
    fuel_level_pickup: 'full',
    currency: 'EGP' as const,
    daily_rate: 0,
    supplier_daily_cost: 0,
    insurance_cost: 0,
    additional_fees: 0,
    security_deposit: 0,
    paid_amount: 0,
    deposit_paid: 0,
    payment_method: '',
    booking_agent_name: '',
    driver_license_number: '',
    driver_license_expiry: '',
    insurance_included: true,
    gps_included: false,
    additional_driver_count: 0,
    pickup_notes: '',
    special_requirements: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const rentalDays = Math.ceil(
      (new Date(formData.rental_end_date).getTime() - new Date(formData.rental_start_date).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;

    const rentalData = {
      ...formData,
      rental_duration_days: rentalDays,
      total_rental_cost: formData.daily_rate * rentalDays,
      supplier_total_cost: formData.supplier_daily_cost * rentalDays,
      exchange_rate_to_egp: 1.00,
      contract_sent: false,
      invoice_sent: false,
      supplier_payment_sent: false,
      currency: formData.currency as string
    };

    addCarRental(rentalData);
    onSuccess();
  };

  const customerOptions = customers?.map(customer => ({
    value: customer.id,
    label: `${customer.name} - ${customer.phone}`
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

  const rentalDays = formData.rental_start_date && formData.rental_end_date
    ? Math.ceil((new Date(formData.rental_end_date).getTime() - new Date(formData.rental_start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : 0;

  const totalCost = formData.daily_rate * rentalDays + formData.insurance_cost + formData.additional_fees;
  const supplierTotalCost = formData.supplier_daily_cost * rentalDays;
  const expectedProfit = totalCost - supplierTotalCost;

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

      {/* تفاصيل الإيجار */}
      <Card>
        <CardHeader>
          <CardTitle>تفاصيل الإيجار</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <Label>ماركة السيارة</Label>
              <Input
                value={formData.vehicle_make}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_make: e.target.value }))}
                placeholder="تويوتا، هوندا، نيسان..."
              />
            </div>

            <div className="space-y-2">
              <Label>موديل السيارة</Label>
              <Input
                value={formData.vehicle_model}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_model: e.target.value }))}
                placeholder="كامري، أكورد، التيما..."
              />
            </div>

            <div className="space-y-2">
              <Label>سنة الصنع</Label>
              <Input
                type="number"
                min="1990"
                max={new Date().getFullYear() + 1}
                value={formData.vehicle_year}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_year: parseInt(e.target.value) || new Date().getFullYear() }))}
              />
            </div>

            <div className="space-y-2">
              <Label>رقم اللوحة</Label>
              <Input
                value={formData.vehicle_plate_number}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_plate_number: e.target.value }))}
                placeholder="رقم لوحة السيارة"
              />
            </div>

            <div className="space-y-2">
              <Label>لون السيارة</Label>
              <Input
                value={formData.vehicle_color}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicle_color: e.target.value }))}
                placeholder="أبيض، أسود، فضي..."
              />
            </div>

            <div className="space-y-2">
              <Label>تاريخ بداية الإيجار *</Label>
              <Input
                type="date"
                value={formData.rental_start_date}
                onChange={(e) => setFormData(prev => ({ ...prev, rental_start_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>تاريخ نهاية الإيجار *</Label>
              <Input
                type="date"
                value={formData.rental_end_date}
                onChange={(e) => setFormData(prev => ({ ...prev, rental_end_date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>مكان الاستلام *</Label>
              <Input
                value={formData.pickup_location}
                onChange={(e) => setFormData(prev => ({ ...prev, pickup_location: e.target.value }))}
                placeholder="مكان استلام السيارة"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>مكان الإرجاع *</Label>
              <Input
                value={formData.return_location}
                onChange={(e) => setFormData(prev => ({ ...prev, return_location: e.target.value }))}
                placeholder="مكان إرجاع السيارة"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>مستوى الوقود عند الاستلام</Label>
              <Select value={formData.fuel_level_pickup} onValueChange={(value) => setFormData(prev => ({ ...prev, fuel_level_pickup: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">ممتلئ</SelectItem>
                  <SelectItem value="three_quarters">ثلاثة أرباع</SelectItem>
                  <SelectItem value="half">نصف</SelectItem>
                  <SelectItem value="quarter">ربع</SelectItem>
                  <SelectItem value="empty">فارغ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>عدد السائقين الإضافيين</Label>
              <Input
                type="number"
                min="0"
                value={formData.additional_driver_count}
                onChange={(e) => setFormData(prev => ({ ...prev, additional_driver_count: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          {rentalDays > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <span className="text-blue-800 font-medium">
                عدد أيام الإيجار: {rentalDays} يوم
              </span>
            </div>
          )}
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
              <Label>السعر اليومي *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.daily_rate}
                onChange={(e) => setFormData(prev => ({ ...prev, daily_rate: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>تكلفة المورد اليومية *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.supplier_daily_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, supplier_daily_cost: parseFloat(e.target.value) || 0 }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>تكلفة التأمين</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.insurance_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, insurance_cost: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>رسوم إضافية</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.additional_fees}
                onChange={(e) => setFormData(prev => ({ ...prev, additional_fees: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            <div className="space-y-2">
              <Label>مبلغ التأمين</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.security_deposit}
                onChange={(e) => setFormData(prev => ({ ...prev, security_deposit: parseFloat(e.target.value) || 0 }))}
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
              <Label>التأمين المدفوع</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.deposit_paid}
                onChange={(e) => setFormData(prev => ({ ...prev, deposit_paid: parseFloat(e.target.value) || 0 }))}
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

          {/* الخدمات المضمنة */}
          <div className="space-y-4">
            <h4 className="font-medium">الخدمات المضمنة:</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="insurance"
                  checked={formData.insurance_included}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, insurance_included: checked as boolean }))}
                />
                <Label htmlFor="insurance">التأمين مشمول</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="gps"
                  checked={formData.gps_included}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, gps_included: checked as boolean }))}
                />
                <Label htmlFor="gps">نظام GPS مشمول</Label>
              </div>
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
                    amount={totalCost} 
                    currency={formData.currency as any} 
                    showInEGP={false} 
                  />
                </div>
              </div>
              <div>
                <span className="text-gray-600">تكلفة المورد:</span>
                <div className="font-semibold">
                  <MultiCurrencyDisplay 
                    amount={supplierTotalCost} 
                    currency={formData.currency as any} 
                    showInEGP={false} 
                  />
                </div>
              </div>
              <div>
                <span className="text-gray-600">الربح المتوقع:</span>
                <div className="font-semibold text-green-600">
                  <MultiCurrencyDisplay 
                    amount={expectedProfit} 
                    currency={formData.currency as any} 
                    showInEGP={false} 
                  />
                </div>
              </div>
              <div>
                <span className="text-gray-600">المبلغ المتبقي:</span>
                <div className="font-semibold text-orange-600">
                  <MultiCurrencyDisplay 
                    amount={totalCost - formData.paid_amount} 
                    currency={formData.currency as any} 
                    showInEGP={false} 
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* معلومات السائق */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات السائق والملاحظات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>رقم رخصة القيادة</Label>
              <Input
                value={formData.driver_license_number}
                onChange={(e) => setFormData(prev => ({ ...prev, driver_license_number: e.target.value }))}
                placeholder="رقم رخصة القيادة"
              />
            </div>

            <div className="space-y-2">
              <Label>تاريخ انتهاء الرخصة</Label>
              <Input
                type="date"
                value={formData.driver_license_expiry}
                onChange={(e) => setFormData(prev => ({ ...prev, driver_license_expiry: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>ملاحظات الاستلام</Label>
            <Textarea
              value={formData.pickup_notes}
              onChange={(e) => setFormData(prev => ({ ...prev, pickup_notes: e.target.value }))}
              placeholder="ملاحظات عند استلام السيارة"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>متطلبات خاصة</Label>
            <Textarea
              value={formData.special_requirements}
              onChange={(e) => setFormData(prev => ({ ...prev, special_requirements: e.target.value }))}
              placeholder="أي متطلبات خاصة أو ملاحظات"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* أزرار العمليات */}
      <div className="flex gap-2 justify-end">
        <Button 
          type="submit" 
          disabled={isAddingRental}
          className="min-w-32"
        >
          {isAddingRental ? 'جاري الحفظ...' : 'حفظ العقد'}
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

export default CarRentalForm;
