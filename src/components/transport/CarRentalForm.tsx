
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useCarRentals } from '@/hooks/useCarRentals';
import { toast } from 'sonner';
import { SupportedCurrency } from '@/types/currency';

interface CarRentalFormProps {
  onSuccess?: () => void;
}

const CarRentalForm = ({ onSuccess }: CarRentalFormProps) => {
  const { addCarRental } = useCarRentals();

  const [formData, setFormData] = useState({
    customer_name: '',
    supplier_id: '',
    vehicle_type_id: '',
    rental_start_date: '',
    rental_end_date: '',
    pickup_location: '',
    return_location: '',
    daily_rate: 0,
    supplier_daily_cost: 0,
    insurance_cost: 0,
    additional_fees: 0,
    security_deposit: 0,
    paid_amount: 0,
    deposit_paid: 0,
    deposit_returned: 0,
    payment_method: '',
    booking_agent_name: '',
    supplier_name: '',
    fuel_level_pickup: 'full',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: new Date().getFullYear(),
    vehicle_plate_number: '',
    vehicle_color: '',
    driver_license_number: '',
    driver_license_expiry: '',
    insurance_included: true,
    gps_included: false,
    additional_driver_count: 0,
    pickup_notes: '',
    return_notes: '',
    damage_notes: '',
    special_requirements: '',
    currency: 'EGP' as SupportedCurrency
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prevData => ({
      ...prevData,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Calculate rental duration in days
      const startDate = new Date(formData.rental_start_date);
      const endDate = new Date(formData.rental_end_date);
      const rentalDurationDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      // Calculate totals
      const totalRentalCost = formData.daily_rate * rentalDurationDays;
      const supplierTotalCost = formData.supplier_daily_cost * rentalDurationDays;
      const remainingAmount = Math.max(0, totalRentalCost - formData.paid_amount);
      
      await addCarRental({
        ...formData,
        rental_duration_days: rentalDurationDays,
        total_rental_cost: totalRentalCost,
        supplier_total_cost: supplierTotalCost,
        remaining_amount: remainingAmount,
        total_profit: totalRentalCost - supplierTotalCost - formData.insurance_cost - formData.additional_fees,
        contract_sent: false,
        contract_sent_date: null,
        invoice_sent: false,
        invoice_sent_date: null,
        supplier_payment_sent: false,
        supplier_payment_sent_date: null,
        exchange_rate_to_egp: 1.0,
        total_cost_egp: totalRentalCost,
        supplier_cost_egp: supplierTotalCost,
        status_id: null,
        payment_due_date: null,
        currency: formData.currency || 'EGP',
      });
      
      // Reset form
      setFormData({
        customer_name: '',
        supplier_id: '',
        vehicle_type_id: '',
        rental_start_date: '',
        rental_end_date: '',
        pickup_location: '',
        return_location: '',
        daily_rate: 0,
        supplier_daily_cost: 0,
        insurance_cost: 0,
        additional_fees: 0,
        security_deposit: 0,
        paid_amount: 0,
        deposit_paid: 0,
        deposit_returned: 0,
        payment_method: '',
        booking_agent_name: '',
        supplier_name: '',
        fuel_level_pickup: 'full',
        vehicle_make: '',
        vehicle_model: '',
        vehicle_year: new Date().getFullYear(),
        vehicle_plate_number: '',
        vehicle_color: '',
        driver_license_number: '',
        driver_license_expiry: '',
        insurance_included: true,
        gps_included: false,
        additional_driver_count: 0,
        pickup_notes: '',
        return_notes: '',
        damage_notes: '',
        special_requirements: '',
        currency: 'EGP'
      });
      
      toast.success('تم إضافة حجز الإيجار بنجاح');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error adding car rental:', error);
      toast.error('حدث خطأ أثناء إضافة حجز الإيجار');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>إضافة حجز تأجير سيارة</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4">
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
              <Label htmlFor="supplier_name">اسم المورد</Label>
              <Input
                type="text"
                id="supplier_name"
                name="supplier_name"
                value={formData.supplier_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicle_type_id">نوع السيارة</Label>
              <Input
                type="text"
                id="vehicle_type_id"
                name="vehicle_type_id"
                value={formData.vehicle_type_id}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="booking_agent_name">اسم وكيل الحجز</Label>
              <Input
                type="text"
                id="booking_agent_name"
                name="booking_agent_name"
                value={formData.booking_agent_name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rental_start_date">تاريخ بداية الإيجار</Label>
              <Input
                type="date"
                id="rental_start_date"
                name="rental_start_date"
                value={formData.rental_start_date}
                onChange={handleChange}
                required
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
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pickup_location">مكان الاستلام</Label>
              <Input
                type="text"
                id="pickup_location"
                name="pickup_location"
                value={formData.pickup_location}
                onChange={handleChange}
                required
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
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="daily_rate">السعر اليومي</Label>
              <Input
                type="number"
                id="daily_rate"
                name="daily_rate"
                value={formData.daily_rate}
                onChange={handleChange}
                required
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
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="insurance_cost">تكلفة التأمين</Label>
              <Input
                type="number"
                id="insurance_cost"
                name="insurance_cost"
                value={formData.insurance_cost}
                onChange={handleChange}
                required
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
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="security_deposit">تأمين</Label>
              <Input
                type="number"
                id="security_deposit"
                name="security_deposit"
                value={formData.security_deposit}
                onChange={handleChange}
                required
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
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="deposit_paid">تأمين مدفوع</Label>
              <Input
                type="number"
                id="deposit_paid"
                name="deposit_paid"
                value={formData.deposit_paid}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="deposit_returned">تأمين مسترجع</Label>
              <Input
                type="number"
                id="deposit_returned"
                name="deposit_returned"
                value={formData.deposit_returned}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="payment_method">طريقة الدفع</Label>
              <Input
                type="text"
                id="payment_method"
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="fuel_level_pickup">مستوى الوقود عند الاستلام</Label>
              <Select
                name="fuel_level_pickup"
                value={formData.fuel_level_pickup}
                onValueChange={(value) => setFormData(prevData => ({ ...prevData, fuel_level_pickup: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر مستوى الوقود" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">ممتلئ</SelectItem>
                  <SelectItem value="3/4">3/4</SelectItem>
                  <SelectItem value="1/2">1/2</SelectItem>
                  <SelectItem value="1/4">1/4</SelectItem>
                  <SelectItem value="empty">فارغ</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicle_make">صنع السيارة</Label>
              <Input
                type="text"
                id="vehicle_make"
                name="vehicle_make"
                value={formData.vehicle_make}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="vehicle_model">موديل السيارة</Label>
              <Input
                type="text"
                id="vehicle_model"
                name="vehicle_model"
                value={formData.vehicle_model}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicle_year">سنة صنع السيارة</Label>
              <Input
                type="number"
                id="vehicle_year"
                name="vehicle_year"
                value={formData.vehicle_year}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="vehicle_plate_number">رقم لوحة السيارة</Label>
              <Input
                type="text"
                id="vehicle_plate_number"
                name="vehicle_plate_number"
                value={formData.vehicle_plate_number}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="vehicle_color">لون السيارة</Label>
              <Input
                type="text"
                id="vehicle_color"
                name="vehicle_color"
                value={formData.vehicle_color}
                onChange={handleChange}
              />
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="currency">العملة</Label>
              <Select
                name="currency"
                value={formData.currency}
                onValueChange={(value) => setFormData(prevData => ({ ...prevData, currency: value as SupportedCurrency }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر العملة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EGP">EGP</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="SAR">SAR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="insurance_included"
              checked={formData.insurance_included}
              onCheckedChange={(checked) => setFormData(prevData => ({ ...prevData, insurance_included: !!checked }))}
            />
            <Label htmlFor="insurance_included">تأمين مشمول</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="gps_included"
              checked={formData.gps_included}
              onCheckedChange={(checked) => setFormData(prevData => ({ ...prevData, gps_included: !!checked }))}
            />
            <Label htmlFor="gps_included">نظام تحديد المواقع مشمول</Label>
          </div>

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

          <Button type="submit">إضافة حجز</Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default CarRentalForm;
