
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface InvoiceFilters {
  searchTerm?: string;
  status?: string;
  bookingType?: string;
  dateFrom?: string;
  dateTo?: string;
  customerId?: string;
}

export const useInvoicesManagement = (filters?: InvoiceFilters) => {
  const queryClient = useQueryClient();

  // جلب الفواتير مع التصفية والبحث
  const { data: invoices, isLoading, error } = useQuery({
    queryKey: ['invoices', filters],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(`
          *,
          customer:customers(id, name, email, phone),
          hotel_booking:hotel_bookings!invoices_booking_id_fkey(
            id, customer_name, hotel_name, destination_city, check_in_date, 
            check_out_date, internal_booking_number, voucher_sent
          ),
          flight_booking:flight_bookings!invoices_booking_id_fkey(
            id, customer_name, airline_name, departure_date, 
            booking_reference, confirmation_number
          ),
          transport_booking:transport_bookings!invoices_booking_id_fkey(
            id, customer_name, service_type, pickup_location, dropoff_location, 
            service_date, booking_reference
          ),
          car_rental:car_rentals!invoices_booking_id_fkey(
            id, customer_name, vehicle_make, vehicle_model, pickup_date, 
            return_date, rental_reference
          )
        `)
        .order('created_at', { ascending: false });

      // تطبيق الفلاتر
      if (filters?.searchTerm) {
        query = query.or(`
          invoice_number.ilike.%${filters.searchTerm}%,
          notes.ilike.%${filters.searchTerm}%
        `);
      }

      if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters?.bookingType && filters.bookingType !== 'all') {
        query = query.eq('booking_type', filters.bookingType);
      }

      if (filters?.customerId) {
        query = query.eq('customer_id', filters.customerId);
      }

      if (filters?.dateFrom) {
        query = query.gte('issued_date', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('issued_date', filters.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching invoices:', error);
        throw error;
      }

      return data;
    },
  });

  // تحديث حالة الفاتورة
  const updateStatusMutation = useMutation({
    mutationFn: async ({ 
      invoiceId, 
      status, 
      paymentDate 
    }: { 
      invoiceId: string; 
      status: string; 
      paymentDate?: string; 
    }) => {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'paid' && paymentDate) {
        updateData.paid_date = paymentDate;
      }

      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم تحديث حالة الفاتورة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating invoice status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الفاتورة');
    },
  });

  // حذف الفاتورة
  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم حذف الفاتورة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error deleting invoice:', error);
      toast.error('حدث خطأ أثناء حذف الفاتورة');
    },
  });

  // تحديث الفاتورة
  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ 
      invoiceId, 
      updateData 
    }: { 
      invoiceId: string; 
      updateData: any; 
    }) => {
      const { data, error } = await supabase
        .from('invoices')
        .update(updateData)
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('تم تحديث الفاتورة بنجاح');
    },
    onError: (error: any) => {
      console.error('Error updating invoice:', error);
      toast.error('حدث خطأ أثناء تحديث الفاتورة');
    },
  });

  // حساب الإحصائيات
  const getInvoiceStats = () => {
    if (!invoices) return null;

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
    const pendingInvoices = invoices.filter(inv => inv.status === 'sent').length;
    
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.final_amount || 0), 0);
    const paidAmount = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + (inv.final_amount || 0), 0);
    const outstandingAmount = totalAmount - paidAmount;

    return {
      totalInvoices,
      paidInvoices,
      overdueInvoices,
      pendingInvoices,
      totalAmount,
      paidAmount,
      outstandingAmount,
    };
  };

  return {
    invoices,
    isLoading,
    error,
    updateStatus: updateStatusMutation.mutateAsync,
    deleteInvoice: deleteInvoiceMutation.mutateAsync,
    updateInvoice: updateInvoiceMutation.mutateAsync,
    isUpdatingStatus: updateStatusMutation.isPending,
    isDeletingInvoice: deleteInvoiceMutation.isPending,
    isUpdatingInvoice: updateInvoiceMutation.isPending,
    getInvoiceStats,
  };
};
