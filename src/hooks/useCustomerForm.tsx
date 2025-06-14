
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
  segment_id?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  nationality?: string;
  segment_id?: string;
}

interface UseCustomerFormProps {
  onCustomerAdded?: (customer: Customer) => void;
  onCustomerUpdated?: (customer: Customer) => void;
  initialData?: Partial<CustomerData>;
  isEditMode?: boolean;
  customerId?: string;
}

export const useCustomerForm = ({ 
  onCustomerAdded, 
  onCustomerUpdated, 
  initialData, 
  isEditMode = false,
  customerId 
}: UseCustomerFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { userRole, user } = useAuth();

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

  const checkDuplicatePhone = async (phone: string, excludeId?: string) => {
    if (!phone || phone.length < 10) return false;
    
    try {
      console.log('🔍 فحص تكرار رقم الهاتف:', phone);
      let query = supabase
        .from('customers')
        .select('id, name')
        .eq('phone', phone);
      
      if (excludeId) {
        query = query.neq('id', excludeId);
      }
      
      const { data, error } = await query.limit(1);
      
      if (error) {
        console.error('❌ خطأ في فحص تكرار الهاتف:', error);
        return false;
      }
      
      const isDuplicate = data && data.length > 0;
      console.log('✅ نتيجة فحص التكرار:', { isDuplicate, existingCustomer: isDuplicate ? data[0] : null });
      
      return isDuplicate ? data[0] : false;
    } catch (error) {
      console.error('❌ خطأ عام في فحص تكرار الهاتف:', error);
      return false;
    }
  };

  const logCustomerEdit = async (customerId: string, fieldName: string, oldValue: any, newValue: any) => {
    try {
      await supabase
        .from('customer_edit_history')
        .insert([{
          customer_id: customerId,
          field_name: fieldName,
          old_value: oldValue ? String(oldValue) : null,
          new_value: newValue ? String(newValue) : null,
        }]);
    } catch (error) {
      console.error('خطأ في تسجيل تاريخ التعديل:', error);
    }
  };

  const onSubmit = async (data: CustomerData) => {
    console.log(`🚀 بدء عملية ${isEditMode ? 'تحديث' : 'إضافة'} العميل...`);
    console.log('👤 معلومات المستخدم:', { 
      userEmail: user?.email, 
      userRole, 
      userId: user?.id 
    });
    console.log('📋 بيانات العميل:', data);
    
    setIsSubmitting(true);
    try {
      // التحقق من صلاحيات المستخدم
      console.log('🔐 التحقق من الصلاحيات...');
      const { data: permissionCheck, error: permissionError } = await supabase
        .rpc('can_manage_customers');
      
      if (permissionError) {
        console.error('❌ خطأ في فحص الصلاحيات:', permissionError);
        toast.error('خطأ في التحقق من الصلاحيات');
        return;
      }
      
      if (!permissionCheck) {
        console.warn('⚠️ المستخدم ليس لديه صلاحية إدارة العملاء');
        toast.error('ليس لديك صلاحية إدارة العملاء');
        return;
      }

      // التحقق من تكرار رقم الهاتف
      console.log('🔍 التحقق من تكرار رقم الهاتف:', data.phone);
      const existingCustomer = await checkDuplicatePhone(data.phone, customerId);
      if (existingCustomer) {
        toast.error(`رقم الهاتف ${data.phone} مُسجل بالفعل للعميل: ${existingCustomer.name}`);
        return;
      }

      const customerData = {
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: data.email?.trim() || null,
        nationality: data.nationality?.trim() || null,
        address: data.address?.trim() || null,
        segment_id: data.segment_id || null,
      };
      
      console.log(`📝 البيانات النهائية لل${isEditMode ? 'تحديث' : 'إدراج'}:`, customerData);

      if (isEditMode && customerId) {
        // تحديث العميل الموجود
        const { data: updatedCustomer, error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', customerId)
          .select('id, name, phone, email, nationality, segment_id')
          .single();

        if (error) {
          console.error('❌ خطأ في تحديث العميل:', error);
          if (error.code === '42501') {
            toast.error('ليس لديك صلاحية تحديث العملاء');
          } else {
            toast.error(`خطأ في تحديث العميل: ${error.message}`);
          }
          throw error;
        }

        // تسجيل التعديلات
        if (initialData) {
          Object.keys(customerData).forEach(key => {
            const oldValue = initialData[key as keyof CustomerData];
            const newValue = customerData[key as keyof typeof customerData];
            if (oldValue !== newValue) {
              logCustomerEdit(customerId, key, oldValue, newValue);
            }
          });
        }

        console.log('✅ تم تحديث العميل بنجاح:', updatedCustomer);
        toast.success(`تم تحديث معلومات العميل "${updatedCustomer.name}" بنجاح`);
        onCustomerUpdated?.(updatedCustomer);
      } else {
        // إضافة عميل جديد
        const { data: newCustomer, error } = await supabase
          .from('customers')
          .insert([customerData])
          .select('id, name, phone, email, nationality, segment_id')
          .single();

        if (error) {
          console.error('❌ خطأ في إضافة العميل:', error);
          if (error.code === '42501') {
            toast.error('ليس لديك صلاحية إضافة العملاء');
          } else if (error.code === '23505') {
            toast.error('هذا العميل موجود بالفعل في النظام');
          } else {
            toast.error(`خطأ في إضافة العميل: ${error.message}`);
          }
          throw error;
        }

        console.log('✅ تم إضافة العميل بنجاح:', newCustomer);
        toast.success(`تم إضافة العميل "${newCustomer.name}" بنجاح`);
        onCustomerAdded?.(newCustomer);
      }
    } catch (error) {
      console.error(`❌ خطأ عام في ${isEditMode ? 'تحديث' : 'إضافة'} العميل:`, error);
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
