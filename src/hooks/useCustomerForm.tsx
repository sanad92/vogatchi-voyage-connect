
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useCustomerSubmission } from "./useCustomerSubmission";
import { useAutomationEngine } from "./useAutomationEngine";
import { CustomerData, UseCustomerFormProps } from "@/types/customer";
import { toast } from "sonner";

export const useCustomerForm = ({ 
  onCustomerAdded, 
  onCustomerUpdated, 
  initialData, 
  isEditMode = false,
  customerId 
}: UseCustomerFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, control, reset, watch, trigger } = useForm<CustomerData>({
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      nationality: initialData?.nationality || "",
      address: initialData?.address || "",
      passport_number: initialData?.passport_number || "",
      segment_id: initialData?.segment_id || "",
    }
  });

  const { submitCustomer } = useCustomerSubmission({
    onCustomerAdded,
    onCustomerUpdated,
    isEditMode,
    customerId
  });

  const { executeTrigger } = useAutomationEngine();

  const onSubmit = async (data: CustomerData) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
      // التحقق من صحة البيانات
      if (!data.name?.trim()) {
        toast.error('اسم العميل مطلوب');
        return;
      }

      if (!data.phone?.trim()) {
        toast.error('رقم الهاتف مطلوب');
        return;
      }

      // تنظيف البيانات
      const cleanedData = {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || '',
        nationality: data.nationality?.trim() || '',
        address: data.address?.trim() || '',
        passport_number: data.passport_number?.trim() || '',
        segment_id: data.segment_id || '',
      };

      // إرسال البيانات
      const result = await submitCustomer(cleanedData);

      // Fire automation trigger for new customers
      if (!isEditMode && result?.id) {
        executeTrigger('customer_registered', {
          customerId: result.id,
          customerName: cleanedData.name,
          customerEmail: cleanedData.email,
          customerPhone: cleanedData.phone,
        });
      }

      // إعادة تعيين النموذج في حالة الإضافة فقط
      if (!isEditMode) {
        reset();
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!message.includes('صلاحية') && !message.includes('مسجل بالفعل')) {
        toast.error('حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
      }
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
    onSubmit,
    reset,
    watch,
    trigger
  };
};
