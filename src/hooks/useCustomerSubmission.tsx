import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useOrgId } from './useOrgId';
import { callUntypedRpc } from '@/lib/supabaseRpc';
import type { Customer, CustomerData } from '@/types/customer';

interface UseCustomerSubmissionProps {
  onCustomerAdded?: (customer: Customer) => void;
  onCustomerUpdated?: (customer: Customer) => void;
  isEditMode?: boolean;
  customerId?: string;
}

const customerSelection = `
  id, name, phone, email, nationality, address, passport_number, segment_id,
  total_bookings, total_spent, loyalty_points, last_booking_date, created_at,
  updated_at, archived_at, archived_by
`;

export const useCustomerSubmission = ({
  onCustomerAdded,
  onCustomerUpdated,
  isEditMode = false,
  customerId,
}: UseCustomerSubmissionProps) => {
  const orgId = useOrgId();

  const submitCustomer = async (data: CustomerData) => {
    if (!orgId) throw new Error('لم يتم تحديد المؤسسة');

    const { data: permissionCheck, error: permissionError } = await callUntypedRpc<boolean>(
      'has_org_permission',
      {
        _org_id: orgId,
        _permission: isEditMode ? 'customers_edit' : 'customers_create',
      },
    );
    if (permissionError) {
      toast.error('خطأ في التحقق من الصلاحيات');
      throw permissionError;
    }
    if (!permissionCheck) {
      toast.error('ليس لديك صلاحية إدارة العملاء');
      throw new Error('ليس لديك صلاحية');
    }

    if (!data.name?.trim()) {
      toast.error('اسم العميل مطلوب');
      throw new Error('اسم العميل مطلوب');
    }
    if (!data.phone?.trim()) {
      toast.error('رقم الهاتف مطلوب');
      throw new Error('رقم الهاتف مطلوب');
    }

    const customerData = {
      name: data.name.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      nationality: data.nationality?.trim() || null,
      address: data.address?.trim() || null,
      passport_number: data.passport_number?.trim() || null,
      segment_id: data.segment_id || null,
    };

    if (isEditMode && customerId) {
      const { data: updatedCustomer, error } = await supabase
        .from('customers')
        .update(customerData)
        .eq('id', customerId)
        .eq('organization_id', orgId)
        .select(customerSelection)
        .single();

      if (error) {
        if (error.code === '42501') toast.error('ليس لديك صلاحية تحديث العملاء');
        else if (error.code === '23505') toast.error(error.message);
        else toast.error('تعذر تحديث بيانات العميل');
        throw error;
      }
      if (!updatedCustomer) throw new Error('لم يتم العثور على العميل');

      toast.success('تم تحديث بيانات العميل');
      onCustomerUpdated?.(updatedCustomer);
      return updatedCustomer;
    }

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert([{ ...customerData, organization_id: orgId }])
      .select(customerSelection)
      .single();

    if (error) {
      if (error.code === '42501') toast.error('ليس لديك صلاحية إضافة العملاء');
      else if (error.code === '23505') toast.error(error.message);
      else toast.error('تعذر إضافة العميل');
      throw error;
    }
    if (!newCustomer) throw new Error('لم يتم إنشاء العميل');

    toast.success('تمت إضافة العميل بنجاح');
    onCustomerAdded?.(newCustomer);
    return newCustomer;
  };

  return { submitCustomer };
};
