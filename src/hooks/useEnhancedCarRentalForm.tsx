
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useCarRentals } from '@/hooks/useCarRentals';
import { useUserEmployeeMapping } from '@/hooks/useUserEmployeeMapping';

interface CarRentalFormData {
  // Customer & Supplier
  customer_id: string;
  customer_name: string;
  supplier_id: string;
  supplier_name: string;
  
  // Vehicle Details
  vehicle_type_id: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_color: string;
  vehicle_plate_number: string;
  
  // Rental Dates & Locations
  rental_start_date: string;
  rental_end_date: string;
  rental_duration_days: number;
  pickup_location: string;
  return_location: string;
  
  // Costs & Payments
  daily_rate: number;
  supplier_daily_cost: number;
  total_rental_cost: number;
  supplier_total_cost: number;
  insurance_cost: number;
  additional_fees: number;
  security_deposit: number;
  paid_amount: number;
  deposit_paid: number;
  payment_method: string;
  
  // Driver & License Info
  driver_license_number: string;
  driver_license_expiry: string;
  
  // Additional Info
  booking_agent_id: string;
  booking_agent_name: string;
  insurance_included: boolean;
  gps_included: boolean;
  additional_driver_count: number;
  fuel_level_pickup: string;
  
  // Notes
  pickup_notes: string;
  return_notes: string;
  damage_notes: string;
  special_requirements: string;
  
  // Documents Tracking
  contract_sent: boolean;
  invoice_sent: boolean;
  supplier_payment_sent: boolean;
  
  // Currency
  currency: string;
}

const initialFormData: CarRentalFormData = {
  customer_id: '',
  customer_name: '',
  supplier_id: '',
  supplier_name: '',
  vehicle_type_id: '',
  vehicle_make: '',
  vehicle_model: '',
  vehicle_year: new Date().getFullYear(),
  vehicle_color: '',
  vehicle_plate_number: '',
  rental_start_date: new Date().toISOString().slice(0, 10),
  rental_end_date: new Date().toISOString().slice(0, 10),
  rental_duration_days: 1,
  pickup_location: '',
  return_location: '',
  daily_rate: 0,
  supplier_daily_cost: 0,
  total_rental_cost: 0,
  supplier_total_cost: 0,
  insurance_cost: 0,
  additional_fees: 0,
  security_deposit: 0,
  paid_amount: 0,
  deposit_paid: 0,
  payment_method: 'cash',
  driver_license_number: '',
  driver_license_expiry: new Date().toISOString().slice(0, 10),
  booking_agent_id: '',
  booking_agent_name: '',
  insurance_included: true,
  gps_included: false,
  additional_driver_count: 0,
  fuel_level_pickup: 'full',
  pickup_notes: '',
  return_notes: '',
  damage_notes: '',
  special_requirements: '',
  contract_sent: false,
  invoice_sent: false,
  supplier_payment_sent: false,
  currency: 'EGP'
};

export const useEnhancedCarRentalForm = () => {
  const { addCarRental, isAddingRental } = useCarRentals();
  const { getCurrentEmployeeName } = useUserEmployeeMapping();
  const [formData, setFormData] = useState<CarRentalFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-calculate duration when dates change
  useEffect(() => {
    if (formData.rental_start_date && formData.rental_end_date) {
      const startDate = new Date(formData.rental_start_date);
      const endDate = new Date(formData.rental_end_date);
      const duration = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      setFormData(prev => ({
        ...prev,
        rental_duration_days: duration
      }));
    }
  }, [formData.rental_start_date, formData.rental_end_date]);

  // Auto-calculate totals when costs or duration change
  useEffect(() => {
    const totalRentalCost = formData.daily_rate * formData.rental_duration_days;
    const supplierTotalCost = formData.supplier_daily_cost * formData.rental_duration_days;
    
    setFormData(prev => ({
      ...prev,
      total_rental_cost: totalRentalCost,
      supplier_total_cost: supplierTotalCost
    }));
  }, [formData.daily_rate, formData.supplier_daily_cost, formData.rental_duration_days]);

  const updateField = (field: keyof CarRentalFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields validation
    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'اسم العميل مطلوب';
    }
    if (!formData.supplier_name.trim()) {
      newErrors.supplier_name = 'اسم المورد مطلوب';
    }
    if (!formData.rental_start_date) {
      newErrors.rental_start_date = 'تاريخ بداية الإيجار مطلوب';
    }
    if (!formData.rental_end_date) {
      newErrors.rental_end_date = 'تاريخ نهاية الإيجار مطلوب';
    }
    if (!formData.pickup_location.trim()) {
      newErrors.pickup_location = 'مكان الاستلام مطلوب';
    }
    if (!formData.return_location.trim()) {
      newErrors.return_location = 'مكان التسليم مطلوب';
    }

    // Date validation
    if (formData.rental_start_date && formData.rental_end_date) {
      const startDate = new Date(formData.rental_start_date);
      const endDate = new Date(formData.rental_end_date);
      
      if (endDate < startDate) {
        newErrors.rental_end_date = 'تاريخ نهاية الإيجار يجب أن يكون بعد تاريخ البداية';
      }
    }

    // Cost validation
    if (formData.daily_rate <= 0) {
      newErrors.daily_rate = 'السعر اليومي يجب أن يكون أكبر من صفر';
    }
    if (formData.supplier_daily_cost < 0) {
      newErrors.supplier_daily_cost = 'تكلفة المورد لا يمكن أن تكون سالبة';
    }
    if (formData.paid_amount < 0) {
      newErrors.paid_amount = 'المبلغ المدفوع لا يمكن أن يكون سالباً';
    }
    if (formData.paid_amount > formData.total_rental_cost) {
      newErrors.paid_amount = 'المبلغ المدفوع لا يمكن أن يكون أكبر من إجمالي التكلفة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: "خطأ في البيانات",
        description: "يرجى تصحيح الأخطاء في النموذج.",
        variant: "destructive",
      });
      return;
    }

    const currentEmployee = getCurrentEmployeeName();
    
    const rentalData = {
      ...formData,
      booking_agent_name: currentEmployee,
      remaining_amount: formData.total_rental_cost - formData.paid_amount,
      total_profit: formData.total_rental_cost - formData.supplier_total_cost - formData.insurance_cost - formData.additional_fees,
      exchange_rate_to_egp: 1.0,
      deposit_returned: 0,
      contract_sent_date: formData.contract_sent ? new Date().toISOString() : null,
      invoice_sent_date: formData.invoice_sent ? new Date().toISOString() : null,
      supplier_payment_sent_date: formData.supplier_payment_sent ? new Date().toISOString() : null
    };

    try {
      await addCarRental(rentalData);
      toast({
        title: "تمت الإضافة بنجاح",
        description: "تم إضافة عقد إيجار سيارة جديد بنجاح.",
      });
      
      // Reset form
      setFormData(initialFormData);
      setErrors({});
      
      return true;
    } catch (error) {
      console.error("Failed to add car rental:", error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة عقد إيجار سيارة جديد.",
        variant: "destructive",
      });
      return false;
    }
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setErrors({});
  };

  return {
    formData,
    errors,
    updateField,
    validateForm,
    handleSubmit,
    resetForm,
    isSubmitting: isAddingRental
  };
};
