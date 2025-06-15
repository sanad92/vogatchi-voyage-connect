
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface DeleteOptions {
  table: string;
  id: string;
  itemName: string;
  itemType: string;
}

export const useSuperAdminOperations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { isSuperAdmin, user } = useAuth();

  // دالة عامة لحذف أي عنصر
  const deleteItem = async ({ table, id, itemName, itemType }: DeleteOptions) => {
    if (!isSuperAdmin()) {
      toast.error('ليس لديك صلاحية لهذه العملية');
      return { success: false, error: 'غير مصرح' };
    }

    try {
      setIsLoading(true);
      console.log(`🗑️ بدء حذف ${itemType}:`, { table, id, itemName });

      // تنفيذ عملية الحذف
      const { error } = await supabase
        .from(table as any)
        .delete()
        .eq('id', id);

      if (error) {
        console.error(`❌ خطأ في حذف ${itemType}:`, error);
        toast.error(`فشل في حذف ${itemType}: ${error.message}`);
        return { success: false, error: error.message };
      }

      // تسجيل العملية في audit log
      await supabase.rpc('log_admin_action' as any, {
        p_action_type: 'delete',
        p_target_table: table,
        p_target_id: id,
        p_description: `حذف ${itemType}: ${itemName}`
      });

      console.log(`✅ تم حذف ${itemType} بنجاح`);
      toast.success(`تم حذف ${itemType} بنجاح`);
      return { success: true };

    } catch (error: any) {
      console.error(`💥 خطأ في حذف ${itemType}:`, error);
      toast.error(`حدث خطأ أثناء حذف ${itemType}`);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  // دالة لحذف عميل
  const deleteCustomer = async (customerId: string, customerName: string) => {
    return await deleteItem({
      table: 'customers',
      id: customerId,
      itemName: customerName,
      itemType: 'العميل'
    });
  };

  // دالة لحذف فاتورة
  const deleteInvoice = async (invoiceId: string, invoiceNumber: string) => {
    return await deleteItem({
      table: 'invoices',
      id: invoiceId,
      itemName: invoiceNumber,
      itemType: 'الفاتورة'
    });
  };

  // دالة لحذف حجز فندق
  const deleteHotelBooking = async (bookingId: string, bookingNumber: string) => {
    return await deleteItem({
      table: 'hotel_bookings',
      id: bookingId,
      itemName: bookingNumber,
      itemType: 'حجز الفندق'
    });
  };

  // دالة لحذف حجز طيران
  const deleteFlightBooking = async (bookingId: string, bookingReference: string) => {
    return await deleteItem({
      table: 'flight_bookings',
      id: bookingId,
      itemName: bookingReference,
      itemType: 'حجز الطيران'
    });
  };

  // دالة لحذف تأجير سيارة
  const deleteCarRental = async (rentalId: string, rentalReference: string) => {
    return await deleteItem({
      table: 'car_rentals',
      id: rentalId,
      itemName: rentalReference,
      itemType: 'تأجير السيارة'
    });
  };

  // دالة لحذف مورد
  const deleteSupplier = async (supplierId: string, supplierName: string) => {
    return await deleteItem({
      table: 'suppliers',
      id: supplierId,
      itemName: supplierName,
      itemType: 'المورد'
    });
  };

  // دالة لحذف موظف
  const deleteEmployee = async (employeeId: string, employeeName: string) => {
    return await deleteItem({
      table: 'employees',
      id: employeeId,
      itemName: employeeName,
      itemType: 'الموظف'
    });
  };

  // دالة لتعديل أي عنصر (عامة)
  const updateItem = async (table: string, id: string, updates: any, itemType: string) => {
    if (!isSuperAdmin()) {
      toast.error('ليس لديك صلاحية لهذه العملية');
      return { success: false, error: 'غير مصرح' };
    }

    try {
      setIsLoading(true);
      console.log(`✏️ بدء تعديل ${itemType}:`, { table, id, updates });

      const { data, error } = await supabase
        .from(table as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error(`❌ خطأ في تعديل ${itemType}:`, error);
        toast.error(`فشل في تعديل ${itemType}: ${error.message}`);
        return { success: false, error: error.message };
      }

      // تسجيل العملية في audit log
      await supabase.rpc('log_admin_action' as any, {
        p_action_type: 'update',
        p_target_table: table,
        p_target_id: id,
        p_description: `تعديل ${itemType}`
      });

      console.log(`✅ تم تعديل ${itemType} بنجاح`);
      toast.success(`تم تعديل ${itemType} بنجاح`);
      return { success: true, data };

    } catch (error: any) {
      console.error(`💥 خطأ في تعديل ${itemType}:`, error);
      toast.error(`حدث خطأ أثناء تعديل ${itemType}`);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    deleteItem,
    deleteCustomer,
    deleteInvoice,
    deleteHotelBooking,
    deleteFlightBooking,
    deleteCarRental,
    deleteSupplier,
    deleteEmployee,
    updateItem,
    isSuperAdmin: isSuperAdmin()
  };
};
