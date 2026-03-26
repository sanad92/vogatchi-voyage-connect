import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { useFlightBookings } from '@/hooks/useFlightBookings';
import { useExpenses } from '@/hooks/useExpenses';
import type { SupportedCurrency } from '@/types/currency';

interface FlightFormData {
  // Customer & Agent
  customer_id: string;
  customer_name: string;
  supplier_name: string;
  booking_agent_id: string;
  booking_agent_name: string;
  
  // Flight Details
  departure_airport_id: string;
  arrival_airport_id: string;
  airline_id: string;
  flight_class_id: string;
  departure_date: string;
  arrival_date: string;
  number_of_passengers: number;
  
  // Pricing
  ticket_price_per_person: number;
  taxes_and_fees: number;
  supplier_cost: number;
  total_cost: number;
  paid_amount: number;
  currency: SupportedCurrency;
  payment_method: string;
  
  // Additional Info
  booking_reference: string;
  confirmation_number: string;
  special_requests: string;
  meal_preferences: string;
  seat_preferences: string;
  
  // Documents Tracking
  contract_sent: boolean;
  invoice_sent: boolean;
  supplier_payment_sent: boolean;
}

const initialFormData: FlightFormData = {
  customer_id: '',
  customer_name: '',
  supplier_name: '',
  booking_agent_id: '',
  booking_agent_name: '',
  departure_airport_id: '',
  arrival_airport_id: '',
  airline_id: '',
  flight_class_id: '',
  departure_date: new Date().toISOString().slice(0, 10),
  arrival_date: new Date().toISOString().slice(0, 10),
  number_of_passengers: 1,
  ticket_price_per_person: 0,
  taxes_and_fees: 0,
  supplier_cost: 0,
  total_cost: 0,
  paid_amount: 0,
  currency: 'EGP',
  payment_method: 'cash',
  booking_reference: '',
  confirmation_number: '',
  special_requests: '',
  meal_preferences: '',
  seat_preferences: '',
  contract_sent: false,
  invoice_sent: false,
  supplier_payment_sent: false
};

export const useEnhancedFlightForm = () => {
  const { addFlightBooking, isAddingBooking } = useFlightBookings();
  const { employees } = useExpenses();
  const [formData, setFormData] = useState<FlightFormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-calculate total cost when pricing changes
  useEffect(() => {
    const totalCost = (formData.ticket_price_per_person * formData.number_of_passengers) + formData.taxes_and_fees;
    setFormData(prev => ({
      ...prev,
      total_cost: totalCost
    }));
  }, [formData.ticket_price_per_person, formData.number_of_passengers, formData.taxes_and_fees]);

  const updateField = (field: keyof FlightFormData, value: any) => {
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
    if (!formData.departure_airport_id) {
      newErrors.departure_airport_id = 'مطار المغادرة مطلوب';
    }
    if (!formData.arrival_airport_id) {
      newErrors.arrival_airport_id = 'مطار الوصول مطلوب';
    }
    if (!formData.departure_date) {
      newErrors.departure_date = 'تاريخ المغادرة مطلوب';
    }
    if (formData.ticket_price_per_person <= 0) {
      newErrors.ticket_price_per_person = 'سعر التذكرة يجب أن يكون أكبر من صفر';
    }
    if (formData.supplier_cost < 0) {
      newErrors.supplier_cost = 'تكلفة المورد لا يمكن أن تكون سالبة';
    }

    // Date validation
    if (formData.departure_date && formData.arrival_date) {
      const departureDate = new Date(formData.departure_date);
      const arrivalDate = new Date(formData.arrival_date);
      
      if (arrivalDate < departureDate) {
        newErrors.arrival_date = 'تاريخ الوصول يجب أن يكون بعد تاريخ المغادرة';
      }
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

    const currentEmployee = employees?.find(emp => emp.id === formData.booking_agent_id);
    
    const bookingData = {
      customer_id: formData.customer_id,
      customer_name: formData.customer_name,
      supplier_name: formData.supplier_name,
      booking_agent_id: formData.booking_agent_id,
      booking_agent_name: currentEmployee?.full_name || formData.booking_agent_name,
      departure_airport_id: formData.departure_airport_id,
      arrival_airport_id: formData.arrival_airport_id,
      airline_id: formData.airline_id,
      flight_class_id: formData.flight_class_id,
      departure_date: formData.departure_date,
      arrival_date: formData.arrival_date,
      number_of_passengers: formData.number_of_passengers,
      ticket_price_per_person: formData.ticket_price_per_person,
      taxes_and_fees: formData.taxes_and_fees,
      total_cost: formData.total_cost, // إضافة total_cost المطلوب
      supplier_cost: formData.supplier_cost,
      paid_amount: formData.paid_amount,
      currency: formData.currency,
      payment_method: formData.payment_method,
      confirmation_number: formData.confirmation_number,
      special_requests: formData.special_requests,
      meal_preferences: formData.meal_preferences,
      seat_preferences: formData.seat_preferences,
      remaining_amount: Math.max(0, formData.total_cost - formData.paid_amount),
      total_profit: formData.total_cost - formData.supplier_cost,
      exchange_rate_to_egp: 1.0,
      contract_sent_date: formData.contract_sent ? new Date().toISOString() : null,
      invoice_sent_date: formData.invoice_sent ? new Date().toISOString() : null,
      supplier_payment_sent_date: formData.supplier_payment_sent ? new Date().toISOString() : null
    };

    try {
      await addFlightBooking(bookingData);
      toast({
        title: "تمت الإضافة بنجاح",
        description: "تم إضافة حجز الطيران بنجاح.",
      });
      
      // Reset form
      setFormData(initialFormData);
      setErrors({});
      
      return true;
    } catch (error) {
      console.error("Failed to add flight booking:", error);
      toast({
        title: "خطأ",
        description: "فشل في إضافة حجز الطيران.",
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
    isSubmitting: isAddingBooking
  };
};
