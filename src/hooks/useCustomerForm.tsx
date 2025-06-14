
import { useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface CustomerData {
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
  address?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
}

interface UseCustomerFormProps {
  onCustomerAdded: (customer: Customer) => void;
  initialData?: Partial<CustomerData>;
}

export const useCustomerForm = ({ onCustomerAdded, initialData }: UseCustomerFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userRole } = useAuth();

  const { register, handleSubmit, formState: { errors } } = useForm<CustomerData>({
    defaultValues: {
      name: initialData?.name || "",
      phone: initialData?.phone || "",
      email: initialData?.email || "",
      nationality: initialData?.nationality || "",
      address: initialData?.address || "",
    }
  });

  const checkDuplicatePhone = async (phone: string) => {
    if (!phone || phone.length < 10) return false;
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .eq('phone', phone)
        .limit(1);
      
      if (error) {
        console.error('Error checking duplicate phone:', error);
        return false;
      }
      return data && data.length > 0 ? data[0] : false;
    } catch (error) {
      console.error('Error in checkDuplicatePhone:', error);
      return false;
    }
  };

  const onSubmit = async (data: CustomerData) => {
    console.log('بدء عملية إضافة عميل جديد...');
    console.log('دور المستخدم الحالي:', userRole);
    
    setIsSubmitting(true);
    try {
      // التحقق من تكرار رقم الهاتف
      console.log('التحقق من تكرار رقم الهاتف:', data.phone);
      const existingCustomer = await checkDuplicatePhone(data.phone);
      if (existingCustomer) {
        toast.error(`رقم الهاتف ${data.phone} مُسجل بالفعل للعميل: ${existingCustomer.name}`);
        setIsSubmitting(false);
        return;
      }

      console.log('محاولة إدراج العميل الجديد...');
      const customerData = {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        nationality: data.nationality?.trim() || null,
        address: data.address?.trim() || null,
      };
      
      console.log('بيانات العميل المراد إدراجها:', customerData);

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert([customerData])
        .select('id, name, phone, email, nationality')
        .single();

      if (error) {
        console.error('خطأ في قاعدة البيانات:', error);
        
        // معالجة أنواع الأخطاء المختلفة
        if (error.code === '42501') {
          toast.error('ليس لديك صلاحية إضافة العملاء. يرجى التواصل مع الإدارة.');
        } else if (error.code === '23505') {
          toast.error('هذا العميل موجود بالفعل في النظام.');
        } else if (error.message.includes('RLS')) {
          toast.error('مشكلة في الصلاحيات. يرجى التواصل مع الدعم الفني.');
        } else {
          toast.error(`خطأ في إضافة العميل: ${error.message}`);
        }
        throw error;
      }

      console.log('تم إضافة العميل بنجاح:', newCustomer);
      toast.success('تم إضافة العميل بنجاح');
      onCustomerAdded(newCustomer);
    } catch (error) {
      console.error('خطأ عام في إضافة العميل:', error);
      
      // إذا لم يتم التعامل مع الخطأ أعلاه
      if (!error.code) {
        toast.error('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    register,
    handleSubmit,
    errors,
    isSubmitting,
    onSubmit
  };
};
