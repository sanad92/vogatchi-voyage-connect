
import { useState } from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewHotelBooking, Customer } from "@/types/hotelBooking";
import CustomerSearch from "@/components/customers/CustomerSearch";
import QuickCustomerAdd from "@/components/customers/QuickCustomerAdd";

interface CustomerSectionProps {
  register: UseFormRegister<NewHotelBooking>;
  setValue: UseFormSetValue<NewHotelBooking>;
  errors: FieldErrors<NewHotelBooking>;
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer) => void;
}

const CustomerSection = ({ 
  register, 
  setValue, 
  errors, 
  selectedCustomer, 
  onCustomerSelect 
}: CustomerSectionProps) => {
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const handleCustomerSelect = (customer: Customer) => {
    onCustomerSelect(customer);
    setValue('customer_name', customer.name);
    setValue('customer_id', customer.id);
    setShowQuickAdd(false);
  };

  const handleNewCustomer = () => {
    setShowQuickAdd(true);
  };

  const handleCustomerAdded = (customer: Customer) => {
    handleCustomerSelect(customer);
    setShowQuickAdd(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>معلومات العميل</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {showQuickAdd ? (
          <QuickCustomerAdd
            onCustomerAdded={handleCustomerAdded}
            onCancel={() => setShowQuickAdd(false)}
          />
        ) : (
          <>
            <div>
              <Label>العميل *</Label>
              <CustomerSearch
                onCustomerSelect={handleCustomerSelect}
                onNewCustomer={handleNewCustomer}
                selectedCustomer={selectedCustomer}
              />
            </div>
            
            {!selectedCustomer && (
              <div>
                <Label htmlFor="customer_name">اسم العميل (نص حر) *</Label>
                <Input 
                  id="customer_name"
                  {...register('customer_name', { required: 'اسم العميل مطلوب' })}
                  placeholder="أدخل اسم العميل"
                />
                {errors.customer_name && <p className="text-red-500 text-sm">{errors.customer_name.message}</p>}
              </div>
            )}
          </>
        )}
        
        <div>
          <Label htmlFor="booking_agent_name">اسم موظف الحجز *</Label>
          <Input 
            id="booking_agent_name"
            {...register('booking_agent_name', { required: 'اسم موظف الحجز مطلوب' })}
          />
          {errors.booking_agent_name && <p className="text-red-500 text-sm">{errors.booking_agent_name.message}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

export default CustomerSection;
