
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import CustomerSelection from "@/components/shared/CustomerSelection";
import { Customer } from "@/types/customer";
import { UseFormReturn } from "react-hook-form";
import { FlightBookingFormData } from "../hooks/useFlightBookingForm";

interface CustomerAgentFormSectionProps {
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer | null) => void;
  form: UseFormReturn<FlightBookingFormData>;
  currentEmployee: any;
}

const CustomerAgentFormSection = ({
  selectedCustomer,
  onCustomerSelect,
  form,
  currentEmployee
}: CustomerAgentFormSectionProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          معلومات العميل وموظف الحجز
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <CustomerSelection
          selectedCustomer={selectedCustomer}
          onCustomerSelect={onCustomerSelect}
          register={form.register}
          setValue={form.setValue}
          errors={form.formState.errors}
        />

        <div className="bg-gray-50 p-4 rounded-lg border">
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            موظف الحجز
          </label>
          <div className="flex items-center gap-2">
            <Input
              value={currentEmployee?.full_name || "مستخدم غير محدد"}
              readOnly
              className="bg-gray-100 cursor-not-allowed"
              disabled
            />
            {currentEmployee?.employee_code && (
              <Badge variant="outline" className="text-xs">
                {currentEmployee.employee_code}
              </Badge>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            يتم تعيين موظف الحجز تلقائياً من المستخدم المُسجل حالياً
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerAgentFormSection;
