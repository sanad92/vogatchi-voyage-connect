
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plane, Save, RotateCcw } from 'lucide-react';
import { useEnhancedFlightForm } from '@/hooks/useEnhancedFlightForm';
import { useExpenses } from '@/hooks/useExpenses';
import { useFlightBookings } from '@/hooks/useFlightBookings';
import CustomerAgentSection from './enhanced/CustomerAgentSection';
import FlightDetailsSection from './enhanced/FlightDetailsSection';
import FlightPricingSection from './enhanced/FlightPricingSection';
import DocumentsTracking from '@/components/shared/DocumentsTracking';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface EnhancedFlightBookingFormProps {
  onSuccess?: () => void;
}

const EnhancedFlightBookingForm = ({ onSuccess }: EnhancedFlightBookingFormProps) => {
  const { employees } = useExpenses();
  const { airports, airlines, flightClasses } = useFlightBookings();
  const {
    formData,
    errors,
    updateField,
    handleSubmit,
    resetForm,
    isSubmitting
  } = useEnhancedFlightForm();

  const onSubmit = async (e: React.FormEvent) => {
    const success = await handleSubmit(e);
    if (success && onSuccess) {
      onSuccess();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plane className="h-6 w-6 text-blue-600" />
          نموذج حجز طيران محسن
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Customer & Agent Section */}
          <CustomerAgentSection
            customerId={formData.customer_id}
            customerName={formData.customer_name}
            supplierId=""
            supplierName={formData.supplier_name}
            bookingAgentId={formData.booking_agent_id}
            onCustomerSelect={(id, name) => {
              updateField('customer_id', id);
              updateField('customer_name', name);
            }}
            onCustomerNameChange={(name) => updateField('customer_name', name)}
            onSupplierSelect={(id, name) => updateField('supplier_name', name)}
            onSupplierNameChange={(name) => updateField('supplier_name', name)}
            onBookingAgentChange={(agentId) => updateField('booking_agent_id', agentId)}
            employees={employees}
            errors={errors}
          />

          <Separator />

          {/* Flight Details Section */}
          <FlightDetailsSection
            departureAirportId={formData.departure_airport_id}
            arrivalAirportId={formData.arrival_airport_id}
            airlineId={formData.airline_id}
            flightClassId={formData.flight_class_id}
            departureDate={formData.departure_date}
            arrivalDate={formData.arrival_date}
            numberOfPassengers={formData.number_of_passengers}
            onDepartureAirportChange={(id) => updateField('departure_airport_id', id)}
            onArrivalAirportChange={(id) => updateField('arrival_airport_id', id)}
            onAirlineChange={(id) => updateField('airline_id', id)}
            onFlightClassChange={(id) => updateField('flight_class_id', id)}
            onDepartureDateChange={(date) => updateField('departure_date', date)}
            onArrivalDateChange={(date) => updateField('arrival_date', date)}
            onPassengersChange={(count) => updateField('number_of_passengers', count)}
            airports={airports}
            airlines={airlines}
            flightClasses={flightClasses}
            errors={errors}
          />

          <Separator />

          {/* Flight Pricing Section */}
          <FlightPricingSection
            ticketPricePerPerson={formData.ticket_price_per_person}
            supplierCost={formData.supplier_cost}
            taxesAndFees={formData.taxes_and_fees}
            totalCost={formData.total_cost}
            paidAmount={formData.paid_amount}
            currency={formData.currency}
            paymentMethod={formData.payment_method}
            numberOfPassengers={formData.number_of_passengers}
            onTicketPriceChange={(price) => updateField('ticket_price_per_person', price)}
            onSupplierCostChange={(cost) => updateField('supplier_cost', cost)}
            onTaxesFeesChange={(amount) => updateField('taxes_and_fees', amount)}
            onPaidAmountChange={(amount) => updateField('paid_amount', amount)}
            onCurrencyChange={(currency) => updateField('currency', currency)}
            onPaymentMethodChange={(method) => updateField('payment_method', method)}
            errors={errors}
          />

          <Separator />

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">معلومات إضافية</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="booking_reference">رقم الحجز</Label>
                <Input
                  id="booking_reference"
                  value={formData.booking_reference}
                  onChange={(e) => updateField('booking_reference', e.target.value)}
                  placeholder="رقم حجز الطيران"
                />
              </div>
              
              <div>
                <Label htmlFor="confirmation_number">رقم التأكيد</Label>
                <Input
                  id="confirmation_number"
                  value={formData.confirmation_number}
                  onChange={(e) => updateField('confirmation_number', e.target.value)}
                  placeholder="رقم تأكيد الحجز"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="special_requests">طلبات خاصة</Label>
                <Textarea
                  id="special_requests"
                  value={formData.special_requests}
                  onChange={(e) => updateField('special_requests', e.target.value)}
                  placeholder="أي طلبات خاصة"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="meal_preferences">تفضيلات الوجبات</Label>
                <Textarea
                  id="meal_preferences"
                  value={formData.meal_preferences}
                  onChange={(e) => updateField('meal_preferences', e.target.value)}
                  placeholder="تفضيلات الوجبات"
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="seat_preferences">تفضيلات المقاعد</Label>
                <Textarea
                  id="seat_preferences"
                  value={formData.seat_preferences}
                  onChange={(e) => updateField('seat_preferences', e.target.value)}
                  placeholder="تفضيلات المقاعد"
                  rows={3}
                />
              </div>
            </div>
          </div>

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
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ حجز الطيران'}
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={resetForm}
              disabled={isSubmitting}
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

export default EnhancedFlightBookingForm;
