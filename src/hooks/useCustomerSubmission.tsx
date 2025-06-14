
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useCustomerValidation } from "./useCustomerValidation";

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

interface UseCustomerSubmissionProps {
  onCustomerAdded?: (customer: Customer) => void;
  onCustomerUpdated?: (customer: Customer) => void;
  isEditMode?: boolean;
  customerId?: string;
}

export const useCustomerSubmission = ({ 
  onCustomerAdded, 
  onCustomerUpdated, 
  isEditMode = false,
  customerId 
}: UseCustomerSubmissionProps) => {
  const { userRole, user } = useAuth();
  const { checkDuplicatePhone } = useCustomerValidation();

  const submitCustomer = async (data: CustomerData) => {
    console.log(`🚀 بدء عملية ${isEditMode ? 'تحديث' : 'إضافة'} العميل...`);
    console.log('👤 معلومات المستخدم:', { 
      userEmail: user?.email, 
      userRole, 
      userId: user?.id 
    });
    console.log('📋 بيانات العميل:', data);
    
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
    }
  };

  return {
    submitCustomer
  };
};
