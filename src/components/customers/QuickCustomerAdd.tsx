
import { useState } from "react";
import { Customer, CustomerData } from "@/types/customer";
import EnhancedCustomerForm from "./EnhancedCustomerForm";

interface QuickCustomerAddProps {
  onCustomerAdded: (customer: Customer) => void;
  onCancel: () => void;
  onViewCustomer?: (customerId: string) => void;
}

const QuickCustomerAdd = ({ onCustomerAdded, onCancel, onViewCustomer }: QuickCustomerAddProps) => {
  return (
    <EnhancedCustomerForm
      onCustomerAdded={onCustomerAdded}
      onCancel={onCancel}
      onViewCustomer={onViewCustomer}
      isEditMode={false}
    />
  );
};

export default QuickCustomerAdd;
