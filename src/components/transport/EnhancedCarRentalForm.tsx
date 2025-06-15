
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Car, Save, RotateCcw } from 'lucide-react';
import { useEnhancedCarRentalForm } from '@/hooks/useEnhancedCarRentalForm';
import CustomerSupplierSection from './car-rental/enhanced/CustomerSupplierSection';
import VehicleDetailsSection from './car-rental/enhanced/VehicleDetailsSection';
import RentalDatesLocationsSection from './car-rental/enhanced/RentalDatesLocationsSection';
import CostCalculationSection from '@/components/shared/CostCalculationSection';
import PaymentSection from '@/components/shared/PaymentSection';
import DocumentsTracking from '@/components/shared/DocumentsTracking';
import AdditionalInfoSection from './car-rental/AdditionalInfoSection';
import { useEmployees } from '@/hooks/useEmployees';

interface EnhancedCarRentalFormProps {
  onSuccess?: () => void;
}

const EnhancedCarRentalForm = ({ onSuccess }: EnhancedCarRentalFormProps) => {
  const { employees } = useEmployees();
  const {
    formData,
    errors,
    updateField,
    handleSubmit,
    resetForm,
    isSubmitting
  } = useEnhancedCarRentalForm();

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
          <Car className="h-6 w-6 text-green-600" />
          نموذج حجز تأجير سيارة محسن
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Customer & Supplier Section */}
          <CustomerSupplierSection
            customerId={formData.customer_id}
            customerName={formData.customer_name}
            supplierId={formData.supplier_id}
            supplierName={formData.supplier_name}
            onCustomerSelect={(id, name) => {
              updateField('customer_id', id);
              updateField('customer_name', name);
            }}
            onCustomerNameChange={(name) => updateField('customer_name', name)}
            onSupplierSelect={(id, name) => {
              updateField('supplier_id', id);
              updateField('supplier_name', name);
            }}
            onSupplierNameChange={(name) => updateField('supplier_name', name)}
            errors={errors}
          />

          <Separator />

          {/* Vehicle Details Section */}
          <VehicleDetailsSection
            vehicleTypeId={formData.vehicle_type_id}
            vehicleMake={formData.vehicle_make}
            vehicleModel={formData.vehicle_model}
            vehicleYear={formData.vehicle_year}
            vehicleColor={formData.vehicle_color}
            vehiclePlateNumber={formData.vehicle_plate_number}
            onVehicleTypeChange={(typeId) => updateField('vehicle_type_id', typeId)}
            onVehicleMakeChange={(make) => updateField('vehicle_make', make)}
            onVehicleModelChange={(model) => updateField('vehicle_model', model)}
            onVehicleYearChange={(year) => updateField('vehicle_year', year)}
            onVehicleColorChange={(color) => updateField('vehicle_color', color)}
            onVehiclePlateNumberChange={(plateNumber) => updateField('vehicle_plate_number', plateNumber)}
            errors={errors}
          />

          <Separator />

          {/* Rental Dates & Locations Section */}
          <RentalDatesLocationsSection
            rentalStartDate={formData.rental_start_date}
            rentalEndDate={formData.rental_end_date}
            rentalDurationDays={formData.rental_duration_days}
            pickupLocation={formData.pickup_location}
            returnLocation={formData.return_location}
            onRentalStartDateChange={(date) => updateField('rental_start_date', date)}
            onRentalEndDateChange={(date) => updateField('rental_end_date', date)}
            onPickupLocationChange={(location) => updateField('pickup_location', location)}
            onReturnLocationChange={(location) => updateField('return_location', location)}
            errors={errors}
          />

          <Separator />

          {/* Cost Calculation Section */}
          <CostCalculationSection
            dailyRate={formData.daily_rate}
            supplierDailyCost={formData.supplier_daily_cost}
            duration={formData.rental_duration_days}
            additionalCosts={{
              insurance: formData.insurance_cost,
              fees: formData.additional_fees
            }}
            onDailyRateChange={(rate) => updateField('daily_rate', rate)}
            onSupplierCostChange={(cost) => updateField('supplier_daily_cost', cost)}
            onAdditionalCostsChange={(costs) => {
              updateField('insurance_cost', costs.insurance || 0);
              updateField('additional_fees', costs.fees || 0);
            }}
            currency={formData.currency}
            title="حساب تكاليف الإيجار"
          />

          <Separator />

          {/* Payment Section */}
          <PaymentSection
            totalAmount={formData.total_rental_cost}
            paidAmount={formData.paid_amount}
            depositPaid={formData.deposit_paid}
            securityDeposit={formData.security_deposit}
            paymentMethod={formData.payment_method}
            onPaidAmountChange={(amount) => updateField('paid_amount', amount)}
            onDepositPaidChange={(amount) => updateField('deposit_paid', amount)}
            onSecurityDepositChange={(amount) => updateField('security_deposit', amount)}
            onPaymentMethodChange={(method) => updateField('payment_method', method)}
            currency={formData.currency}
            showDeposit={true}
          />

          <Separator />

          {/* Additional Information Section */}
          <AdditionalInfoSection
            formData={{
              booking_agent_id: formData.booking_agent_id,
              driver_license_number: formData.driver_license_number,
              driver_license_expiry: formData.driver_license_expiry,
              insurance_included: formData.insurance_included,
              gps_included: formData.gps_included,
              additional_driver_count: formData.additional_driver_count.toString(),
              pickup_notes: formData.pickup_notes,
              return_notes: formData.return_notes,
              damage_notes: formData.damage_notes,
              special_requirements: formData.special_requirements
            }}
            employees={employees || []}
            employeesLoading={false}
            onInputChange={(e) => {
              const { name, value, type, checked } = e.target;
              updateField(name, type === 'checkbox' ? checked : value);
            }}
            onSelectChange={(name, value) => updateField(name, value)}
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
              disabled={isSubmitting}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ عقد الإيجار'}
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

export default EnhancedCarRentalForm;
