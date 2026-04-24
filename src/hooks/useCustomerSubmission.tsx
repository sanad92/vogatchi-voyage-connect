
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useOptimizedAuth } from "@/hooks/useOptimizedAuth";
import { useEnhancedCustomerValidation } from "./useEnhancedCustomerValidation";
import { useOrgId } from './useOrgId';

interface CustomerData {
  name: string; phone: string; email?: string; nationality?: string; address?: string; segment_id?: string;
}

interface Customer {
  id: string; name: string; phone: string; email?: string; nationality?: string; segment_id?: string;
}

interface UseCustomerSubmissionProps {
  onCustomerAdded?: (customer: Customer) => void;
  onCustomerUpdated?: (customer: Customer) => void;
  isEditMode?: boolean;
  customerId?: string;
}

export const useCustomerSubmission = ({ onCustomerAdded, onCustomerUpdated, isEditMode = false, customerId }: UseCustomerSubmissionProps) => {
  const { userRole, user } = useOptimizedAuth();
  const { checkDuplicatePhone } = useEnhancedCustomerValidation();
  const orgId = useOrgId();

  const submitCustomer = async (data: CustomerData) => {
    try {
      const { data: permissionCheck, error: permissionError } = await supabase.rpc('can_manage_customers' as any);
      if (permissionError) { toast.error('خطأ في التحقق من الصلاحيات'); throw permissionError; }
      if (!permissionCheck) { toast.error('ليس لديك صلاحية إدارة العملاء'); throw new Error('ليس لديك صلاحية'); }

      if (!data.name?.trim()) { toast.error('اسم العميل مطلوب'); throw new Error('اسم العميل مطلوب'); }
      if (!data.phone?.trim()) { toast.error('رقم الهاتف مطلوب'); throw new Error('رقم الهاتف مطلوب'); }

      const dupResult: any = await checkDuplicatePhone(data.phone, customerId);
      const existingCustomer = dupResult?.isDuplicate ? dupResult.existingCustomer : (dupResult && !('isDuplicate' in dupResult) ? dupResult : null);
      if (existingCustomer) { const msg = `رقم الهاتف ${data.phone} مُسجل بالفعل للعميل: ${existingCustomer.name}`; toast.error(msg); throw new Error(msg); }

      const customerData = {
        name: data.name.trim(), phone: data.phone.trim(), email: data.email?.trim() || null,
        nationality: data.nationality?.trim() || null, address: data.address?.trim() || null, segment_id: data.segment_id || null,
      };

      if (isEditMode && customerId) {
        const { data: updatedCustomer, error } = await supabase.from('customers').update(customerData).eq('id', customerId)
          .select(`id, name, phone, email, nationality, address, segment_id, total_bookings, total_spent, loyalty_points, last_booking_date, created_at, updated_at`).single();
        if (error) { if (error.code === '42501') toast.error('ليس لديك صلاحية تحديث العملاء'); else toast.error(`خطأ: ${error.message}`); throw error; }
        if (!updatedCustomer) throw new Error('لم يتم العثور على العميل');
        if (onCustomerUpdated) onCustomerUpdated(updatedCustomer);
        return updatedCustomer;
      } else {
        const { data: newCustomer, error } = await supabase.from('customers').insert([{ ...customerData, organization_id: orgId }])
          .select(`id, name, phone, email, nationality, address, segment_id, total_bookings, total_spent, loyalty_points, last_booking_date, created_at, updated_at`).single();
        if (error) { if (error.code === '42501') toast.error('ليس لديك صلاحية إضافة العملاء'); else if (error.code === '23505') toast.error('هذا العميل موجود بالفعل'); else toast.error(`خطأ: ${error.message}`); throw error; }
        if (!newCustomer) throw new Error('لم يتم إنشاء العميل');
        if (onCustomerAdded) onCustomerAdded(newCustomer);
        return newCustomer;
      }
    } catch (error) {
      if (error instanceof Error && !error.message.includes('ليس لديك صلاحية')) toast.error(`فشل في ${isEditMode ? 'تحديث' : 'إضافة'} العميل`);
      throw error;
    }
  };

  return { submitCustomer };
};
