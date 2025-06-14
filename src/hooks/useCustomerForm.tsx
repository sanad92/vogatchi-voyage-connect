
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useCustomerSubmission } from "./useCustomerSubmission";
import { CustomerData, UseCustomerFormProps } from "@/types/customer";

export const useCustomerForm = ({ 
  onCustomerAdded, 
  onCustomerUpdated, 
  initialData, 
  isEditMode = false,
  customerId 
}: UseCustomerFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, control } = useForm<CustomerData>({
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      nationality: initialData?.nationality || "",
      address: initialData?.address || "",
      segment_id: initialData?.segment_id || "",
    }
  });

  const { submitCustomer } = useCustomerSubmission({
    onCustomerAdded,
    onCustomerUpdated,
    isEditMode,
    customerId
  });

  const onSubmit = async (data: CustomerData) => {
    setIsSubmitting(true);
    try {
      await submitCustomer(data);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    register,
    handleSubmit,
    errors,
    control,
    isSubmitting,
    onSubmit
  };
};
