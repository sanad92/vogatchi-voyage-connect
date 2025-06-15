import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from 'lucide-react';
import { useCarRentals } from '@/hooks/useCarRentals';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useVehicleTypes } from '@/hooks/useVehicleTypes';
import { useEmployees } from '@/hooks/useEmployees';
import { toast } from '@/hooks/use-toast';
import { useUserEmployeeMapping } from '@/hooks/useUserEmployeeMapping';

const CarRentalForm = () => {
  const { addCarRental, isAddingRental } = useCarRentals();
  const { suppliers, suppliersLoading } = useSuppliers();
  const { vehicleTypes, vehicleTypesLoading } = useVehicleTypes();
  const { employees, employeesLoading } = useEmployees();
  const { getCurrentEmployeeName } = useUserEmployeeMapping();

  const [formData, setFormData] = useState({
    customer_name: '',
    supplier_id: '',
    vehicle_type_id: '',
    rental_start_date: new Date().toISOString().slice(0, 10),
    rental_end_date: new Date().toISOString().slice(0, 10),
    rental_duration_days: '1',
    pickup_location: '',
    return_location: '',
    daily_rate: '0',
    total_rental_cost: '0',
    supplier_daily_cost: '0',
    supplier_total_cost: '0',
    insurance_cost: '0',
    additional_fees: '0',
    security_deposit: '0',
    paid_amount: '0',
    deposit_paid: '0',
    payment_method: 'cash',
    booking_agent_id: '',
    driver_license_number: '',
    driver_license_expiry: new Date().toISOString().slice(0, 10),
    insurance_included: false,
    gps_included: false,
    additional_driver_count: '0',
    pickup_notes: '',
    return_notes: '',
    damage_notes: '',
    special_requirements: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customer_name || !formData.supplier_id || !formData.vehicle_type_id) {
      toast({
        title: "خطأ",
        description: "يرجى ملء جميع الحقول المطلوبة.",
        variant: "destructive",
      });
      return;
    }

    const selectedSupplier = suppliers?.find(s => s.id === formData.supplier_id);
    const currentEmployee = getCurrentEmployeeName();

    const rentalData = {
      customer_name: formData.customer_name,
      supplier_id: formData.supplier_id,
      supplier_name: selectedSupplier?.name || 'غير محدد',
      vehicle_type_id: formData.vehicle_type_id,
      rental_start_date: formData.rental_start_date,
      rental_end_date: formData.rental_end_date,
      rental_duration_days: parseInt(formData.rental_duration_days),
      pickup_location: formData.pickup_location,
      return_location: formData.return_location,
      daily_rate: parseFloat(formData.daily_rate),
      total_rental_cost: parseFloat(formData.total_rental_cost),
      supplier_daily_cost: parseFloat(formData.supplier_daily_cost),
      supplier_total_cost: parseFloat(formData.supplier_total_cost),
      insurance_cost: parseFloat(formData.insurance_cost),
      additional_fees: parseFloat(formData.additional_fees),
      security_deposit: parseFloat(formData.security_deposit),
      paid_amount: parseFloat(formData.paid_amount),
      deposit_paid: parseFloat(formData.deposit_paid),
      deposit_returned: 0,
      payment_method: formData.payment_method,
      booking_agent_id: formData.booking_agent_id,
      booking_agent_name: currentEmployee,
      driver_license_number: formData.driver_license_number,
      driver_license_expiry: formData.driver_license_expiry,
      insurance_included: formData.insurance_included,
      gps_included: formData.gps_included,
      additional_driver_count: parseInt(formData.additional_driver_count),
      pickup_notes: formData.pickup_notes,
      return_notes: formData.return_notes,
      damage_notes: formData.damage_notes,
      special_requirements: formData.special_requirements,
      currency: 'EGP',
      exchange_rate_to_egp: 1.0,
      contract_sent: false,
      invoice_sent: false,
      supplier_payment_sent: false,
      fuel_level_pickup: 'full',
    };

    try {
      await addCarRental(rentalData);
      toast({
        title: "تمت الإضافة بنجاح",
        description: "تمت إضافة عقد إيجار سيارة جديد بنجاح.",
      });
    } catch (error) {
      console.error("Failed to add car rental:", error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة عقد إيجار سيارة جديد.",
        variant: "destructive",
      });
    }
  };

  if (suppliersLoading || vehicleTypesLoading || employeesLoading) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>إضافة عقد إيجار سيارة</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* معلومات أساسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer_name">اسم العميل</Label>
              <Input
                type="text"
                id="customer_name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="supplier_id">المورد</Label>
              <Select
                value={formData.supplier_id}
                onValueChange={(value) => handleSelectChange('supplier_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر مورد" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* تفاصيل السيارة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicle_type_id">نوع السيارة</Label>
              <Select
                value={formData.vehicle_type_id}
                onValueChange={(value) => handleSelectChange('vehicle_type_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر نوع السيارة" />
                </SelectTrigger>
                <SelectContent>
                  {vehicleTypes?.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name_ar}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* تواريخ ومواقع الإيجار */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rental_start_date">تاريخ بداية الإيجار</Label>
              <Input
                type="date"
                id="rental_start_date"
                name="rental_start_date"
                value={formData.rental_start_date}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="rental_end_date">تاريخ نهاية الإيجار</Label>
              <Input
                type="date"
                id="rental_end_date"
                name="rental_end_date"
                value={formData.rental_end_date}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="rental_duration_days">مدة الإيجار (أيام)</Label>
              <Input
                type="number"
                id="rental_duration_days"
                name="rental_duration_days"
                value={formData.rental_duration_days}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="pickup_location">مكان الاستلام</Label>
              <Input
                type="text"
                id="pickup_location"
                name="pickup_location"
                value={formData.pickup_location}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="return_location">مكان التسليم</Label>
              <Input
                type="text"
                id="return_location"
                name="return_location"
                value={formData.return_location}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* التكاليف والمدفوعات */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="daily_rate">السعر اليومي</Label>
              <Input
                type="number"
                id="daily_rate"
                name="daily_rate"
                value={formData.daily_rate}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="total_rental_cost">إجمالي تكلفة الإيجار</Label>
              <Input
                type="number"
                id="total_rental_cost"
                name="total_rental_cost"
                value={formData.total_rental_cost}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="supplier_daily_cost">تكلفة المورد اليومية</Label>
              <Input
                type="number"
                id="supplier_daily_cost"
                name="supplier_daily_cost"
                value={formData.supplier_daily_cost}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="supplier_total_cost">إجمالي تكلفة المورد</Label>
              <Input
                type="number"
                id="supplier_total_cost"
                name="supplier_total_cost"
                value={formData.supplier_total_cost}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="insurance_cost">تكلفة التأمين</Label>
              <Input
                type="number"
                id="insurance_cost"
                name="insurance_cost"
                value={formData.insurance_cost}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="additional_fees">رسوم إضافية</Label>
              <Input
                type="number"
                id="additional_fees"
                name="additional_fees"
                value={formData.additional_fees}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="security_deposit">مبلغ التأمين</Label>
              <Input
                type="number"
                id="security_deposit"
                name="security_deposit"
                value={formData.security_deposit}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="paid_amount">المبلغ المدفوع</Label>
              <Input
                type="number"
                id="paid_amount"
                name="paid_amount"
                value={formData.paid_amount}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="deposit_paid">التأمين المدفوع</Label>
              <Input
                type="number"
                id="deposit_paid"
                name="deposit_paid"
                value={formData.deposit_paid}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="payment_method">طريقة الدفع</Label>
              <Select
                id="payment_method"
                name="payment_method"
                value={formData.payment_method}
                onValueChange={(value) => setFormData(prev => ({ ...prev, payment_method: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر طريقة الدفع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="credit_card">بطاقة ائتمانية</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* معلومات إضافية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="booking_agent_id">وكيل الحجز</Label>
              <Select
                id="booking_agent_id"
                name="booking_agent_id"
                value={formData.booking_agent_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, booking_agent_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر وكيل الحجز" />
                </SelectTrigger>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="driver_license_number">رقم رخصة القيادة</Label>
              <Input
                type="text"
                id="driver_license_number"
                name="driver_license_number"
                value={formData.driver_license_number}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="driver_license_expiry">تاريخ انتهاء رخصة القيادة</Label>
              <Input
                type="date"
                id="driver_license_expiry"
                name="driver_license_expiry"
                value={formData.driver_license_expiry}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* خيارات */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="insurance_included">تأمين مشمول؟</Label>
            <Input
              type="checkbox"
              id="insurance_included"
              name="insurance_included"
              checked={formData.insurance_included}
              onChange={handleChange}
            />
            <Label htmlFor="gps_included">GPS مشمول؟</Label>
            <Input
              type="checkbox"
              id="gps_included"
              name="gps_included"
              checked={formData.gps_included}
              onChange={handleChange}
            />
          </div>

          {/* عدد السائقين الإضافيين */}
          <div>
            <Label htmlFor="additional_driver_count">عدد السائقين الإضافيين</Label>
            <Input
              type="number"
              id="additional_driver_count"
              name="additional_driver_count"
              value={formData.additional_driver_count}
              onChange={handleChange}
            />
          </div>

          {/* ملاحظات */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickup_notes">ملاحظات الاستلام</Label>
              <Textarea
                id="pickup_notes"
                name="pickup_notes"
                value={formData.pickup_notes}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="return_notes">ملاحظات التسليم</Label>
              <Textarea
                id="return_notes"
                name="return_notes"
                value={formData.return_notes}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="damage_notes">ملاحظات الأضرار</Label>
              <Textarea
                id="damage_notes"
                name="damage_notes"
                value={formData.damage_notes}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="special_requirements">متطلبات خاصة</Label>
              <Textarea
                id="special_requirements"
                name="special_requirements"
                value={formData.special_requirements}
                onChange={handleChange}
              />
            </div>
          </div>

          <Button type="submit" disabled={isAddingRental}>
            {isAddingRental ? "يتم الإرسال..." : "إضافة عقد الإيجار"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CarRentalForm;
