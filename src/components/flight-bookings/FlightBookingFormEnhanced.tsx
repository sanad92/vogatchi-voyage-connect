
import React from "react";
import { Form } from "@/components/ui/form";
import { useFlightBookingForm, FlightBookingFormData } from "./hooks/useFlightBookingForm";
import CustomerAgentFormSection from "./sections/CustomerAgentFormSection";
import FlightDetailsFormSection from "./sections/FlightDetailsFormSection";
import PassengerDetailsEnhanced from "./sections/PassengerDetailsEnhanced";
import FinancialInfoFormSection from "./sections/FinancialInfoFormSection";
import AdditionalServicesFormSection from "./sections/AdditionalServicesFormSection";
import FormActionsSection from "./sections/FormActionsSection";

interface FlightBookingFormEnhancedProps {
  onSuccess?: (booking: any) => void;
  initialData?: Partial<FlightBookingFormData>;
}

const FlightBookingFormEnhanced = ({ onSuccess, initialData }: FlightBookingFormEnhancedProps) => {
  const {
    form,
    flightClasses,
    passengerDetails,
    setPassengerDetails,
    selectedCustomer,
    selectedSupplier,
    currentEmployee,
    totalCost,
    totalProfit,
    createBookingMutation,
    handleCustomerSelect,
    handleSupplierSelect,
    onSubmit,
  } = useFlightBookingForm({ onSuccess, initialData });

  const supplierCost = form.watch('supplier_cost');

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <CustomerAgentFormSection
            selectedCustomer={selectedCustomer}
            onCustomerSelect={handleCustomerSelect}
            form={form}
            currentEmployee={currentEmployee}
          />

          <FlightDetailsFormSection
            form={form}
            flightClasses={flightClasses}
          />

          <PassengerDetailsEnhanced
            passengers={passengerDetails}
            numberOfPassengers={form.watch('number_of_passengers')}
            onChange={setPassengerDetails}
          />

          <FinancialInfoFormSection
            form={form}
            selectedSupplier={selectedSupplier}
            onSupplierSelect={handleSupplierSelect}
            totalCost={totalCost}
            supplierCost={supplierCost}
            totalProfit={totalProfit}
          />

          <AdditionalServicesFormSection form={form} />

          <FormActionsSection isSubmitting={createBookingMutation.isPending} />
        </form>
      </Form>
    </div>
  );
};

export default FlightBookingFormEnhanced;
