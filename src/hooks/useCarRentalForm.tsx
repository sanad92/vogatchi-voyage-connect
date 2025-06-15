
import { useState } from 'react';
import { toast } from '@/hooks/use-toast';
import { useCarRentals } from '@/hooks/useCarRentals';
import { useUserEmployeeMapping } from '@/hooks/useUserEmployeeMapping';

export const useCarRentalForm = () => {
  const { addCarRental, isAddingRental } = useCarRentals();
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

  const handleSubmit = async (e: React.FormEvent, suppliers: any[]) => {
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

  return {
    formData,
    handleChange,
    handleSelectChange,
    handleSubmit,
    isAddingRental
  };
};
