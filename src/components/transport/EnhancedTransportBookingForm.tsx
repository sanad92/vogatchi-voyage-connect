import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Truck, Save, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { useTransportBookings } from '@/hooks/useTransportBookings';
import { useExpenses } from '@/hooks/useExpenses';
import { toast } from '@/hooks/use-toast';
import TransportCustomerAgentSection from './enhanced/TransportCustomerAgentSection';
import TransportTripDetailsSection from './enhanced/TransportTripDetailsSection';
import CostCalculationSection from '@/components/shared/CostCalculationSection';
import PaymentSection from '@/components/shared/PaymentSection';
import DocumentsTracking from '@/components/shared/DocumentsTracking';
import TransportAdditionalInfoSection from './enhanced/TransportAdditionalInfoSection';

interface EnhancedTransportBookingFormProps {
  onSuccess?: () => void;
}

const EnhancedTransportBookingForm = ({ onSuccess }: EnhancedTransportBookingFormProps) => {
  const { employees } = useExpenses();
  const { vehicleTypes, transportRoutes, addTransportBooking, isAddingBooking } = useTransportBookings();
  
  const [formData, setFormData] = useState({
    customer_id: '',
    customer_name: '',
    supplier_name: '',
    booking_agent_id: '',
    route_id: '',
    vehicle_type_id: '',
    departure_date: new Date().toISOString().slice(0, 10),
    departure_time: '',
    arrival_date: '',
    arrival_time: '',
    pickup_location: '',
    dropoff_location: '',
    number_of_passengers: 1,
    cost_per_trip: 0,
    selling_price_per_trip: 0,
    supplier_cost: 0,
    paid_amount: 0,
    currency: 'EGP' as const,
    payment_method: 'cash',
    driver_name: '',
    driver_phone: '',
    vehicle_plate_number: '',
    special_requests: '',
    contract_sent: false,
    invoice_sent: false,
    voucher_sent: false,
    supplier_payment_sent: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
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

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'اسم العميل مطلوب';
    }
    if (!formData.supplier_name.trim()) {
      newErrors.supplier_name = 'اسم المورد مطلوب';
    }
    if (!formData.departure_date) {
      newErrors.departure_date = 'تاريخ المغادرة مطلوب';
    }
    if (!formData.pickup_location.trim()) {
      newErrors.pickup_location = 'مكان الاستلام مطلوب';
    }
    if (!formData.dropoff_location.trim()) {
      newErrors.dropoff_location = 'مكان التسليم مطلوب';
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
      ...formData,
      booking_agent_name: currentEmployee?.full_name || '',
      total_cost: formData.selling_price_per_trip * formData.number_of_passengers,
      remaining_amount: (formData.selling_price_per_trip * formData.number_of_passengers) - formData.paid_amount,
      total_profit: (formData.selling_price_per_trip * formData.number_of_passengers) - formData.supplier_cost,
      exchange_rate_to_egp: 1.0
    };

    try {
      await addTransportBooking(bookingData);
      toast({
        title: "تمت الإضافة بنجاح",
        description: "تم إضافة حجز النقل بنجاح.",
      });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Failed to add transport booking:", error);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      customer_name: '',
      supplier_name: '',
      booking_agent_id: '',
      route_id: '',
      vehicle_type_id: '',
      departure_date: new Date().toISOString().slice(0, 10),
      departure_time: '',
      arrival_date: '',
      arrival_time: '',
      pickup_location: '',
      dropoff_location: '',
      number_of_passengers: 1,
      cost_per_trip: 0,
      selling_price_per_trip: 0,
      supplier_cost: 0,
      paid_amount: 0,
      currency: 'EGP' as const,
      payment_method: 'cash',
      driver_name: '',
      driver_phone: '',
      vehicle_plate_number: '',
      special_requests: '',
      contract_sent: false,
      invoice_sent: false,
      voucher_sent: false,
      supplier_payment_sent: false
    });
    setErrors({});
  };

  const totalCost = formData.selling_price_per_trip * formData.number_of_passengers;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-green-600" />
          نموذج حجز نقل محسن
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer & Agent Section */}
          <TransportCustomerAgentSection
            customerId={formData.customer_id}
            customerName={formData.customer_name}
            supplierName={formData.supplier_name}
            bookingAgentId={formData.booking_agent_id}
            onCustomerSelect={(id, name) => {
              updateField('customer_id', id);
              updateField('customer_name', name);
            }}
            onCustomerNameChange={(name) => updateField('customer_name', name)}
            onSupplierNameChange={(name) => updateField('supplier_name', name)}
            onBookingAgentChange={(agentId) => updateField('booking_agent_id', agentId)}
            employees={employees}
            errors={errors}
          />

          <Separator />

          {/* Trip Details Section */}
          <TransportTripDetailsSection
            routeId={formData.route_id}
            vehicleTypeId={formData.vehicle_type_id}
            departureDate={formData.departure_date}
            departureTime={formData.departure_time}
            arrivalDate={formData.arrival_date}
            arrivalTime={formData.arrival_time}
            pickupLocation={formData.pickup_location}
            dropoffLocation={formData.dropoff_location}
            numberOfPassengers={formData.number_of_passengers}
            onRouteChange={(id) => updateField('route_id', id)}
            onVehicleTypeChange={(id) => updateField('vehicle_type_id', id)}
            onDepartureDateChange={(date) => updateField('departure_date', date)}
            onDepartureTimeChange={(time) => updateField('departure_time', time)}
            onArrivalDateChange={(date) => updateField('arrival_date', date)}
            onArrivalTimeChange={(time) => updateField('arrival_time', time)}
            onPickupLocationChange={(location) => updateField('pickup_location', location)}
            onDropoffLocationChange={(location) => updateField('dropoff_location', location)}
            onPassengersChange={(count) => updateField('number_of_passengers', count)}
            routes={transportRoutes}
            vehicleTypes={vehicleTypes}
            errors={errors}
          />

          <Separator />

          {/* Cost Calculation Section */}
          <CostCalculationSection
            dailyRate={formData.selling_price_per_trip}
            supplierDailyCost={formData.supplier_cost}
            duration={formData.number_of_passengers}
            additionalCosts={{}}
            onDailyRateChange={(rate) => updateField('selling_price_per_trip', rate)}
            onSupplierCostChange={(cost) => updateField('supplier_cost', cost)}
            onAdditionalCostsChange={() => {}}
            currency={formData.currency}
            title="حساب تكاليف النقل"
          />

          <Separator />

          {/* Payment Section */}
          <PaymentSection
            totalAmount={formData.selling_price_per_trip * formData.number_of_passengers}
            paidAmount={formData.paid_amount}
            paymentMethod={formData.payment_method}
            onPaidAmountChange={(amount) => updateField('paid_amount', amount)}
            onPaymentMethodChange={(method) => updateField('payment_method', method)}
            currency={formData.currency}
            showDeposit={false}
          />

          <Separator />

          {/* Additional Information */}
          <TransportAdditionalInfoSection
            driverName={formData.driver_name}
            driverPhone={formData.driver_phone}
            vehiclePlateNumber={formData.vehicle_plate_number}
            specialRequests={formData.special_requests}
            onDriverNameChange={(name) => updateField('driver_name', name)}
            onDriverPhoneChange={(phone) => updateField('driver_phone', phone)}
            onVehiclePlateNumberChange={(plate) => updateField('vehicle_plate_number', plate)}
            onSpecialRequestsChange={(requests) => updateField('special_requests', requests)}
          />

          <Separator />

          {/* Documents Tracking Section */}
          <DocumentsTracking
            contractSent={formData.contract_sent}
            invoiceSent={formData.invoice_sent}
            supplierPaymentSent={formData.supplier_payment_sent}
            onContractSentChange={(sent) => updateField('contract_sent', sent)}
            onInvoiceSentChange={(sent) => updateField('invoice_sent', sent)}
            onSupplierPaymentSentChange={(sent) => updateField('supplier_payment_sent', sent)}
          />

          {/* Form Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={isAddingBooking}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isAddingBooking ? 'جاري الحفظ...' : 'حفظ حجز النقل'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFormData({
                  customer_id: '',
                  customer_name: '',
                  supplier_name: '',
                  booking_agent_id: '',
                  route_id: '',
                  vehicle_type_id: '',
                  departure_date: new Date().toISOString().slice(0, 10),
                  departure_time: '',
                  arrival_date: '',
                  arrival_time: '',
                  pickup_location: '',
                  dropoff_location: '',
                  number_of_passengers: 1,
                  cost_per_trip: 0,
                  selling_price_per_trip: 0,
                  supplier_cost: 0,
                  paid_amount: 0,
                  currency: 'EGP' as const,
                  payment_method: 'cash',
                  driver_name: '',
                  driver_phone: '',
                  vehicle_plate_number: '',
                  special_requests: '',
                  contract_sent: false,
                  invoice_sent: false,
                  voucher_sent: false,
                  supplier_payment_sent: false
                });
                setErrors({});
              }}
              disabled={isAddingBooking}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              إعادة تعيين
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EnhancedTransportBookingForm;
