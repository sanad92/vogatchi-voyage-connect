
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
    if (isSubmitting) {
      console.log('⚠️ العملية قيد التنفيذ بالفعل');
      return;
    }

    console.log('📝 بدء معالجة النموذج:', data);
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
        segment_id: data.segment_id || '',
      };

      console.log('✨ البيانات بعد التنظيف:', cleanedData);

      // إرسال البيانات
      const result = await submitCustomer(cleanedData);
      
      console.log('✅ تم حفظ البيانات بنجاح:', result);

      // إعادة تعيين النموذج في حالة الإضافة فقط
      if (!isEditMode) {
        reset();
      }

    } catch (error) {
      console.error('❌ خطأ في معالجة النموذج:', error);
      
      // رسالة خطأ عامة في حالة عدم وجود رسالة محددة
      if (error instanceof Error) {
        if (!error.message.includes('صلاحية') && !error.message.includes('مكرر')) {
          toast.error('حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى');
        }
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
